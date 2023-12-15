use std::collections::HashMap;

use discover::Discover;
use serde::{Deserialize, Serialize};

mod discover;

#[derive(Debug, Serialize, Deserialize)]
struct MediaEvent {
    curr_time: std::time::Duration,

    #[serde(flatten)]
    _rest: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GenericEvent {
    execute_at: std::time::Duration,

    #[serde(flatten)]
    _rest: HashMap<String, serde_json::Value>,
}

struct State {
    events: Vec<GenericEvent>,
    master_offset: std::time::Duration,
    // connection: todo!(),
}

struct EventServer {}
struct EventClient {}

#[tokio::main]
async fn main() {
    loop {
        let on_promotion = || {};
        let on_demotion = || {};
        let discover_server = Discover::new(on_promotion, on_demotion, None, None)
            .unwrap_or_else(|e| panic!("failed to create socket: {e}"));
        let err = discover_server.start().await;
        eprintln!("Recoverable error found: {err}.\nRestarting server...");
    }
}
