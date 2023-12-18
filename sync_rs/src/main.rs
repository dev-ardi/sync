use clap::Parser;
use discover::{Discover, MasterState};
use event_client::EventClient;
use event_server::EventServer;
use ipc_client::IpcClient;

use crate::ipc_client::{MasterIpc, SlaveIpc};

mod event_client;
mod event_server;
mod ipc_client;

mod discover;
mod messages;

/// Slave node. This node repeatedly polls the master node for events. It keeps track
/// of the ping and is responsible for forwarding the events to the slave Deneva
///
pub struct Slave {
    master_state: MasterState,
    ipc: SlaveIpc,
    client: EventClient,
}

///  Master node. This node just receives events from Deneva and broadcasts it to the
///  slave nodes.
pub struct Master {
    ipc: MasterIpc,
    server: EventServer,
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
        let on_demotion = |state| {};
        let discover_server = Discover::new(ipc, on_promotion, on_demotion, None, None)
            .unwrap_or_else(|e| panic!("failed to create socket: {e}"));
        let err = discover_server.start().await;
        eprintln!("Recoverable error found: {err}.\nRestarting server...");
    }
}
