use std::net::{Ipv4Addr, SocketAddrV4};

use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::TcpStream,
};

use crate::{
    discover::MasterState,
    // discover::SlaveState,
    event_server::EventServer,
    messages::{ErrorMessage, GenericEvent, MediaEvent, RecvEventIPC, SentEventIPC},
    EventClient,
    Master,
    Slave,
};

// Not necessarily on the same machine though. If at any point this is a requirement rename this.
pub struct IpcClient {
    sock: TcpStream, // Not a mutex because we won't read and write form it at the same time.
}

impl IpcClient {
    pub async fn new(port: u16) -> Self {
        let addr = SocketAddrV4::new(Ipv4Addr::LOCALHOST, port);
        let sock = TcpStream::connect(addr).await.unwrap();
        Self { sock }
    }
}

pub struct MasterIpc(pub IpcClient);
impl MasterIpc {
    pub async fn start<F: Fn(RecvEventIPC) + Send + Sync>(&mut self, callbacks: F) {
        loop {
            let mut buf = Vec::new();
            if let Err(e) = self.0.sock.read_to_end(&mut buf).await {
                eprintln!("Error reading data from Deneva: {e}");
                continue;
            };
            match serde_json::from_slice::<RecvEventIPC>(&buf) {
                Ok(ev) => (callbacks)(ev),
                Err(e) => {
                    eprintln!("Error reading data from Deneva: {e}");
                    let err = ErrorMessage(format!("Error reading message: {e}"));
                    let err = serde_json::to_vec(&err).unwrap();
                    let _ = self.0.sock.write(&err);
                    continue;
                }
            }
        }
    }
}
pub struct SlaveIpc(pub IpcClient);

impl SlaveIpc {
    pub async fn send(&mut self, ev: SentEventIPC) -> Result<(), std::io::Error> {
        let ev = serde_json::to_vec(&ev).expect("Can't serialize event");
        self.0.sock.write(&ev).await?;
        Ok(())
    }
}

pub enum Masterness {
    // Disconnected,
    Searching(IpcClient),
    Master(Master),
    Slave(Slave),
}

impl Masterness {
    pub fn new(client: IpcClient) -> Self {
        Masterness::Searching(client)
    }
    pub fn to_master(&mut self, server: EventServer) {
        replace_with::replace_with_or_abort(self, |self_| match self_ {
            Masterness::Searching(c) => Masterness::Master(Master {
                ipc: MasterIpc(c),
                server,
            }),
            Masterness::Master(master) => {
                eprintln!("Critical error: to_master called on a master!");
                Masterness::Master(master)
            }
            Masterness::Slave(s) => Masterness::Master(Master {
                ipc: MasterIpc(s.ipc.0),
                server,
            }),
        });
    }

    pub fn to_slave(&mut self, client: EventClient, master_state: MasterState) {
        replace_with::replace_with_or_abort(self, |self_| match self_ {
            Masterness::Searching(c) => Masterness::Slave(Slave {
                ipc: SlaveIpc(c),
                client,
                master_state,
            }),
            Masterness::Master(master) => {
                eprintln!("Critical error: to_slave called on a master!");
                Masterness::Master(master)
            }
            Masterness::Slave(s) => Masterness::Slave(Slave {
                ipc: SlaveIpc(s.ipc.0),
                client,
                master_state,
            }),
        });
    }
}
