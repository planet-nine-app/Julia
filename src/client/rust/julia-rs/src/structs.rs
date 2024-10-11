use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use serde_json::Value;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all="camelCase")]
pub struct Prompt {
    pub timestamp: String,
    pub prompter: String,
    pub prompt: Option<String>,
    pub new_timestamp: Option<String>,
    #[serde(rename = "newPubKey")]
    pub new_pub_key: Option<String>,
    #[serde(rename = "newUUID")]    
    pub new_uuid: Option<String>,
    pub new_signature: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SuccessResult {
    pub success: bool
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all="camelCase")]
pub struct Message {
    pub timestamp: String,
    #[serde(rename = "senderUUID")]
    pub sender_uuid: String,
    #[serde(rename = "receiverUUID")]
    pub receiver_uuid: String,
    pub message: String,
}

pub type Messages = [Message];
