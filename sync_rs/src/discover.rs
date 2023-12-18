use std::time::Instant;
use std::{
    collections::HashMap,
    net::{Ipv4Addr, SocketAddr, UdpSocket},
    time::{Duration, SystemTime},
};

use serde::{Deserialize, Serialize};
use std::sync::mpsc::{channel, Receiver, Sender};
use tokio::spawn;
use tokio::task::JoinHandle;
use tokio::time::sleep;

use crate::event_client::EventClient;
use crate::event_server::EventServer;
use crate::ipc_client::{IpcClient, Masterness};
use crate::Slave;

#[derive(Debug, Clone)]
pub struct MasterState {
    ip_master: SocketAddr,
    master_time: SystemTime,
    last_seen_master: Instant,
    master_priority: Option<i32>,
}

pub struct Discover {
    slaves: HashMap<SocketAddr, (SystemTime, Instant)>,
    started_at: SystemTime,

    socket: UdpSocket,

    sync_group: Option<u8>,
    master_priority: Option<i32>,
    ness: Masterness,
}

impl Discover {
    pub fn new<F: FnMut() + Send + 'static, G: FnMut(MasterState) + Send + 'static>(
        ipc: IpcClient,
        _on_promotion: F,
        _on_demotion: G,
        sync_group: Option<u8>,
        master_priority: Option<i32>,
    ) -> std::io::Result<Self> {
        let addr = SocketAddr::new(Ipv4Addr::BROADCAST.into(), 5555);
        let socket = UdpSocket::bind(addr)?;
        socket.set_broadcast(true)?;

        let started_at = SystemTime::now();
        Ok(Self {
            ness: Masterness::Searching(ipc),
            slaves: HashMap::new(),
            started_at,
            sync_group,
            socket,
            master_priority,
        })
    }

    async fn promote(&mut self, tx: Sender<Hello>) {
        let server = EventServer::new().await;
        self.ness.to_master(server);
        tx.send(self.hello()).unwrap();
    }

    async fn demote(&mut self, state: MasterState, tx: Sender<Hello>) {
        let client = EventClient::new().await;

        self.ness.to_slave(client, state);
        tx.send(self.hello()).unwrap();
    }

    fn hello(&self) -> Hello {
        Hello {
            sync_group: self.sync_group,
            master_priority: self.master_priority,
            is_master: matches!(self.ness, Masterness::Master(_)),
            started_at: self.started_at,
        }
    }

    fn sender_loop(&self, rx: Receiver<Hello>) -> JoinHandle<()> {
        fn ser_hello(hello: &Hello) -> Vec<u8> {
            serde_json::to_vec(hello).expect("can't serialize hello")
        }
        let mut hello = ser_hello(&self.hello());
        let socket = self.socket.try_clone().expect("failed to clone socket");
        spawn(async move {
            loop {
                hello = rx
                    .try_recv()
                    .map(|hello| ser_hello(&hello))
                    .unwrap_or(hello);

                if let Err(e) = socket.send(&hello) {
                    eprintln!("Error sending hello: {e}.");
                    break;
                }
                sleep(Duration::from_secs(10)).await;
            }
        })
    }

    pub async fn start(mut self) -> RestartError {
        let (tx, rx) = channel(); // for updating the hello
        self.sender_loop(rx);
        let handle = spawn(async move {
            // cache syscall
            let local_addr = self.socket.local_addr().expect("Couldn't get local addr");

            let mut s = Vec::new();
            loop {
                let (_, addr) = match self.socket.recv_from(&mut s) {
                    Ok(x) => x,
                    Err(e) => {
                        eprintln!("error handling received hello: {e}");
                        continue;
                    }
                };

                //ignore messages from self
                if addr != local_addr {
                    let hello = match serde_json::from_slice::<Hello>(&s) {
                        Ok(e) => e,
                        Err(e) => {
                            eprintln!("error handling received hello: {e}");
                            continue;
                        }
                    };
                    if hello.sync_group != self.sync_group {
                        continue;
                    }

                    if hello.is_master {
                        match self.ness {
                            Masterness::Searching(_) => {
                                // We hook with the first master we find
                                self.ness.to_master(EventServer::new().await);
                            }
                            Masterness::Slave(Slave {
                                ref mut master_state,
                                ..
                            }) => {
                                if master_state.master_priority <= hello.master_priority
                                    && self.started_at < hello.started_at
                                {
                                    *master_state = hello.slave_state(addr);
                                } else if master_state.ip_master == addr {
                                    master_state.last_seen_master = Instant::now();
                                }
                            }
                            Masterness::Master(_) => {
                                // Do we need to stop being master?
                                if self.master_priority <= hello.master_priority {
                                    match self.started_at.cmp(&hello.started_at) {
                                        std::cmp::Ordering::Less => {
                                            self.demote(hello.slave_state(addr), tx.clone()).await;
                                        }
                                        // This will lead to an unreliable state. Both masters will
                                        // restart and one of the slaves will pick up.
                                        std::cmp::Ordering::Equal => {
                                            return RestartError::DuplicatedTime;
                                        }
                                        std::cmp::Ordering::Greater => eprintln!("There is a duplicated master with a newer time. Ignoring..."),
                                    };
                                }
                            }
                        }
                    } else {
                        self.slaves
                            .entry(addr)
                            .and_modify(|(_, d)| *d = Instant::now())
                            .or_insert((hello.started_at, Instant::now()));
                    }
                }

                fn timeout(x: Instant) -> bool {
                    x.elapsed() > Duration::from_secs(30)
                }

                if let Masterness::Slave(slave) = &self.ness {
                    if timeout(slave.master_state.last_seen_master) {
                        if !self
                            .slaves
                            .values()
                            .any(|x| x.0 > self.started_at || timeout(x.1))
                        {
                            self.promote(tx.clone()).await;
                        }
                    }
                }
            }
        });
        handle.await.unwrap() // We want to propagate the thread's panic.
    }
}

#[derive(thiserror::Error, Debug, Clone, Copy)]
pub enum RestartError {
    #[error("Two servers with the same system time found")]
    DuplicatedTime,
}

#[derive(Debug, Serialize, Deserialize)]
struct Hello {
    sync_group: Option<u8>,
    master_priority: Option<i32>,
    is_master: bool,
    started_at: SystemTime,
}

impl Hello {
    fn slave_state(&self, ip_master: SocketAddr) -> MasterState {
        MasterState {
            ip_master,
            master_time: self.started_at,
            last_seen_master: Instant::now(),
            master_priority: self.master_priority,
        }
    }
}
