use crate::messages::{GenericEvent, MediaEvent};

pub struct EventClient {
    gen_events: Vec<GenericEvent>,
    media_events: Vec<MediaEvent>,
}

impl EventClient {
    pub async fn new() -> Self {
        EventClient {
            gen_events: Vec::new(),
            media_events: Vec::new(),
        }
    }
}
