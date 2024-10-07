use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all="camelCase")]
pub struct Prompt {
    pub timestamp: String,
    pub prompter: String,
    pub prompt: Option<String>,
    pub new_timestamp: Option<String>,
    pub new_pub_key: Option<String>,
    pub new_uuid: Option<String>,
    pub new_signature: Option<String>,
}

pub type SuccessResult = HashMap<String, Value>;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all="camelCase")]
pub struct Message {
    pub timestamp: String,
    pub sender_uuid: String,
    pub receiver_uuid: String,
    pub message: String,
}

pub type Messages = [Message];
