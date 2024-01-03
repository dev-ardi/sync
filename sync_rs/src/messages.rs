use serde::{Deserialize, Serialize};
use std::{collections::HashMap, time::SystemTime};

#[derive(Debug, Serialize, Deserialize)]
pub struct SentMediaEvent {
    pub measurement_at: SystemTime,
    pub media: IpcMediaEvent,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IpcMediaEvent {
    pub media: Vec<MediaEvent>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MediaEvent {
    pub current_time: std::time::Duration,

    #[serde(flatten)]
    pub rest: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct ErrorMessage(pub String);

#[derive(Debug, Serialize, Deserialize)]
pub struct GenericEvent {
    pub execute_at: SystemTime,

    #[serde(flatten)]
    pub rest: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateStatus {
    is_master: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WhatchaGot {}

#[derive(Debug, Serialize, Deserialize)]
pub struct GotSum {
    pub time: SystemTime,
    pub events: Vec<GenericEvent>,
    pub media: Vec<MediaEvent>,
}

impl UpdateStatus {
    pub fn new(is_master: bool) -> Self {
        Self { is_master }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub enum SentEventIPC {
    MediaEvent(MediaEvent),
    GenericEvent(GenericEvent),
    UpdateStatus(UpdateStatus),
}

#[derive(Debug, Serialize, Deserialize)]
pub enum EventsMasterSlave {
    MediaEvent(MediaEvent),
    GenericEvent(GenericEvent),
    UpdateStatus(UpdateStatus),
    Ping(WhatchaGot),
    Pong(GotSum),
}

#[derive(Debug, Serialize, Deserialize)]
pub enum RecvEventIPC {
    MediaEvent(MediaEvent),
    GenericEvent(GenericEvent),
}
