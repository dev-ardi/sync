use std::collections::VecDeque;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use clap::Parser;
use discover::{Discover, MasterState};
use event_server::EventServer;
use ipc_client::IpcClient;
use messages::WhatchaGot;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::task::JoinHandle;
use tokio::time::sleep;
use tokio_util::sync::CancellationToken;

use crate::ipc_client::{MasterIpc, SlaveIpc};

mod event_client;
mod event_server;
mod ipc_client;

mod discover;
mod messages;

use crate::messages::{GenericEvent, GotSum, MediaEvent, SentEventIPC};

pub struct EventClient {
    gen_events: Vec<GenericEvent>,
    media_events: Vec<MediaEvent>,
    socket: TcpStream,
}

pub struct DropHandle<T>(JoinHandle<T>);
impl<T> Drop for DropHandle<T> {
    fn drop(&mut self) {
        self.0.abort();
    }
}

impl<T> From<JoinHandle<T>> for DropHandle<T> {
    fn from(value: JoinHandle<T>) -> Self {
        DropHandle(value)
    }
}

pub struct Pinger<const T: usize>(pub VecDeque<Duration>);

impl<const T: usize> Pinger<T> {
    pub fn new() -> Self {
        Self(VecDeque::with_capacity(T))
    }
    pub fn get(&self) -> Duration {
        self.0[T / 2]
    }
    pub fn push(&mut self, time: Duration) {
        if self.0.len() == 10 {
            self.0.pop_front();
        }
        self.push(time);
    }
}

/// Slave node. This node repeatedly polls the master node for events. It keeps track
/// of the ping and is responsible for forwarding the events to the slave Deneva
///
pub struct Slave {
    master_state: MasterState,
    comms_handle: JoinHandle<Arc<Mutex<SlaveIpc>>>,
    cancel: CancellationToken,
}

impl Slave {
    async fn new(master_state: MasterState, ipc: SlaveIpc) -> std::io::Result<Self> {
        let ipc = Arc::from(Mutex::from(ipc));

        let addr = master_state.ip_master.ip();
        let stream = TcpStream::connect((addr, 5555)).await?;

        let comms = TcpStream::connect((addr, 5555)).await?;

        let token = CancellationToken::new();
        let comms_handle = tokio::spawn(async move {
            let last_pings: Pinger<10> = Pinger::new();
            let ping = postcard::to_vec(&WhatchaGot {}).unwrap();
            let token = token.clone();
            loop {
                if token.is_cancelled() {
                    return ipc;
                }
                let time = Instant::now();
                if let Err(e) = comms.write(&ping).await {
                    eprintln!("{e}");
                    continue;
                };
                let mut buf = Vec::new();
                let res = comms.read_to_end(&mut buf).await;
                if let Err(e) = comms.read_to_end(&mut buf).await {
                    eprintln!("{e}");
                    continue;
                };
                let pong: GotSum = match postcard::from_bytes(&buf) {
                    Ok(r) => r,
                    Err(e) => {
                        eprintln!("{e}");
                        continue;
                    }
                };
                let elapsed = time.elapsed() / 2;
                let master_time = pong.time - elapsed;
                let evs = pong.events.into_iter().map(|ev| {
                    let ipc = ipc.clone();
                    tokio::spawn(async {
                        let offset = ev
                            .execute_at
                            .duration_since(master_time)
                            .unwrap_or_default();

                        let ev = SentEventIPC::GenericEvent(ev);
                        sleep(offset.into()).await;
                        let lock = ipc.lock().unwrap().send(ev).await.unwrap();
                    })
                });
                let media = pong.media.into_iter().map(|ev| {
                    let ipc = ipc.clone();
                    tokio::spawn(async {
                        let offset = master_time
                            .duration_since(ev.measurement_at)
                            .unwrap_or_default();
                        let current_time = ev.latest_known_time + offset;

                        let ev = SentEventIPC::MediaEvent(ev);
                        let lock = ipc.lock().unwrap().send(ev).await.unwrap();
                    })
                });
                for f in media {
                    if let Err(e) = f.await {
                        eprintln!("{e}");
                    };
                }
                for f in evs {
                    if let Err(e) = f.await {
                        eprintln!("{e}");
                    };
                }
            }
        });

        Ok(Self {
            master_state,
            comms_handle,
            cancel: token,
        })
    }
    async fn close(self) -> IpcClient {
        self.cancel.cancel();
        let arc = self.comms_handle.await.unwrap();
        Arc::into_inner(arc).unwrap().into_inner().unwrap().0
    }
}

///  Master node. This node just receives events from Deneva and broadcasts it to the
///  slave nodes.
pub struct Master {
    ipc: MasterIpc,
    server: EventServer,
    cancel: CancellationToken,
}

impl Master {
    async fn new(ipc: MasterIpc) -> std::io::Result<Self> {
        let 
        let cb = |event| {


        }
        ipc.start(cb);

        Ok(Self { ipc, server })
    }
}

#[derive(Parser)]
struct Cli {
    // #[clap(short, long)]
    port: u16,
}

#[tokio::main]
async fn main() {
    let port = Cli::parse().port;
    loop {
        let ipc = IpcClient::new(port).await;
        let on_promotion = || {};
        let on_demotion = |_state| {};
        let discover_server = Discover::new(ipc, on_promotion, on_demotion, None, None)
            .unwrap_or_else(|e| panic!("failed to create socket: {e}"));
        let err = discover_server.start().await;
        eprintln!("Recoverable error found: {err}.\nRestarting server...");
    }
}
