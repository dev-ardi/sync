use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct MediaEvent {
    curr_time: std::time::Duration,

    #[serde(flatten)]
    _rest: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GenericEvent {
    execute_at: std::time::Duration,

    #[serde(flatten)]
    _rest: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateStatus {
    event: String,
    is_master: bool,
}

impl UpdateStatus {
    pub fn new(is_master: bool) -> Self {
        Self {
            event: String::from("UpdateStatus"),
            is_master,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub enum SentEvent {
    MediaEvent(MediaEvent),
    GenericEvent(GenericEvent),
    UpdateStatus(UpdateStatus),
}

#[derive(Debug, Serialize, Deserialize)]
pub enum RecvEventMaster {
    MediaEvent(MediaEvent),
    GenericEvent(GenericEvent),
}
