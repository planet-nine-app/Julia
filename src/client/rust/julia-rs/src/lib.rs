mod structs;

#[cfg(test)]
mod tests;

use reqwest::{Client, Response};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sessionless::hex::IntoHex;
use sessionless::{Sessionless, Signature};
use std::time::{SystemTime, UNIX_EPOCH};
use std::collections::HashMap;
use crate::structs::{Prompt, SuccessResult, Message, Messages};

#[derive(Debug, Serialize, Deserialize)]
pub struct JuliaUser {
    pub pub_key: String,
    pub keys: HashMap<String, HashMap<String, String>>,
    pub uuid: String,
    pub messages: Vec<Message>,  
    pub handle: String,
    pub pending_prompts: HashMap<String, HashMap<String, String>>  
}

impl JuliaUser {
    pub fn new(pub_key: String, handle: String) -> Self {
        let mut keys = HashMap::new();
        keys.insert("interactingKeys".to_string(), HashMap::new());
        keys.insert("coordinatingKeys".to_string(), HashMap::new());

        JuliaUser {
            pub_key,
            keys,
            uuid: "".to_string(),
            messages: Vec::new(),  // Initialize as an empty Vec
            handle,
            pending_prompts: HashMap::new()
        }
    }
}

pub struct Julia {
    base_url: String,
    client: Client,
    sessionless: Sessionless,
}

impl Julia {
    pub fn new(base_url: Option<String>) -> Self {
        Julia {
            base_url: base_url.unwrap_or_else(|| "https://dev.julia.allyabase.com/".to_string()),
            client: Client::new(),
            sessionless: Sessionless::new(),
        }
    }

    async fn get(&self, url: &str) -> Result<Response, reqwest::Error> {
        self.client.get(url).send().await
    }

    async fn post(&self, url: &str, payload: serde_json::Value) -> Result<Response, reqwest::Error> {
        self.client
            .post(url)
            .json(&payload)
            .send()
            .await
    }

    async fn put(&self, url: &str, payload: serde_json::Value) -> Result<Response, reqwest::Error> {
        self.client
            .put(url)
            .json(&payload)
            .send()
            .await
    }

    async fn delete(&self, url: &str, payload: serde_json::Value) -> Result<Response, reqwest::Error> {
        self.client
            .delete(url)
            .json(&payload)
            .send()
            .await
    }

    fn get_timestamp() -> String {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("Time went backwards")
            .as_millis()
            .to_string()
    }

    pub async fn create_user(&self, user: JuliaUser) -> Result<JuliaUser, Box<dyn std::error::Error>> {
        let timestamp = Self::get_timestamp();
        let pub_key = self.sessionless.public_key().to_hex();
        let signature = self.sessionless.sign(&format!("{}{}", timestamp, pub_key)).to_hex();
        
        let payload = json!({
            "timestamp": timestamp,
            "pubKey": pub_key,
            "user": user,
            "signature": signature
        }).as_object().unwrap().clone();

        let url = format!("{}user/create", self.base_url);
        let res = self.put(&url, serde_json::Value::Object(payload)).await?;
        let user: JuliaUser = res.json().await?;

        Ok(user)
    }

    pub async fn get_user(&self, uuid: &str) -> Result<JuliaUser, Box<dyn std::error::Error>> {
        let timestamp = Self::get_timestamp();
        let message = format!("{}{}", timestamp, uuid);
        let signature = self.sessionless.sign(&message).to_hex();

        let url = format!("{}user/{}?timestamp={}&signature={}", self.base_url, uuid, timestamp, signature);
        let res = self.get(&url).await?;
        let user: JuliaUser = res.json().await?;

        Ok(user)
    }

    pub async fn get_prompt(&self, uuid: &str) -> Result<JuliaUser, Box<dyn std::error::Error>> {
        let timestamp = Self::get_timestamp();
        let message = format!("{}{}", timestamp, uuid);
        let signature = self.sessionless.sign(&message).to_hex();

        let url = format!("{}user/{}/associate/prompt?timestamp={}&signature={}", self.base_url, uuid, timestamp, signature);
        let res = self.get(&url).await?;
        let user: JuliaUser = res.json().await?;

        Ok(user)
    }

    pub async fn sign_prompt(&self, uuid: &str, prompt: &Prompt) -> Result<JuliaUser, Box<dyn std::error::Error>> {
        let pub_key = self.sessionless.public_key().to_hex();
        let timestamp = Self::get_timestamp();

        let message = format!("{}{}{}{}", timestamp, uuid, pub_key, prompt.prompt.as_deref().unwrap_or(""));
        let signature = self.sessionless.sign(&message).to_hex();

        let payload = json!({
            "timestamp": timestamp,
            "uuid": uuid,
            "pubKey": pub_key,
            "prompt": prompt,
            "signature": signature
        }).as_object().unwrap().clone();

        let url = format!("{}user/{}/associate/signedPrompt", self.base_url, uuid);
        let res = self.post(&url, serde_json::Value::Object(payload)).await?;
        let user: JuliaUser = res.json().await?;

        Ok(user)
    }

    pub async fn associate(&self, uuid: &str, signed_prompt: &Prompt) -> Result<JuliaUser, Box<dyn std::error::Error>> {
        let timestamp = Self::get_timestamp();
        let message = format!("{}{}{}{}", signed_prompt.new_timestamp.as_deref().unwrap_or(""), signed_prompt.new_uuid.as_deref().unwrap_or(""), signed_prompt.new_pub_key.as_deref().unwrap_or(""), signed_prompt.prompt.as_deref().unwrap_or(""));
        let signature = self.sessionless.sign(&message).to_hex();

        let payload = json!({
            "timestamp": timestamp,
            "newTimestamp": signed_prompt.new_timestamp,
            "newUUID": signed_prompt.new_uuid,
            "newPubKey": signed_prompt.new_pub_key,
            "newSignature": signed_prompt.new_signature,
            "prompt": signed_prompt.prompt,
            "signature": signature
        }).as_object().unwrap().clone();

        let url = format!("{}user/{}/associate", self.base_url, uuid);
        let res = self.post(&url, serde_json::Value::Object(payload)).await?;
        let user: JuliaUser = res.json().await?;

        Ok(user)
    }

    pub async fn delete_key(&self, uuid: &str, associated_uuid: &str) -> Result<JuliaUser, Box<dyn std::error::Error>> {
        let timestamp = Self::get_timestamp();
        let message = format!("{}{}{}", timestamp, associated_uuid, uuid);
        let signature = self.sessionless.sign(&message).to_hex();

        let payload = json!({
            "timestamp": timestamp,
            "signature": signature
        }).as_object().unwrap().clone();

        let url = format!("{}associated/{}/user/{}", self.base_url, associated_uuid, uuid);
        let res = self.delete(&url, serde_json::Value::Object(payload)).await?;
        let user: JuliaUser = res.json().await?;
            
        Ok(user)
    }

    pub async fn post_message(&self, uuid: &str, receiver_uuid: &str, contents: String) -> Result<SuccessResult, Box<dyn std::error::Error>> {
        let timestamp = Self::get_timestamp();
        let message = format!("{}{}{}{}", timestamp, uuid, receiver_uuid, contents);
        let signature = self.sessionless.sign(&message).to_hex();

        let payload = json!({
            "timestamp": timestamp,
            "senderUUID": uuid,
            "receiverUUID": receiver_uuid,
            "message": contents
        }).as_object().unwrap().clone();

        let url = format!("{}message", self.base_url);
        let res = self.post(&url, serde_json::Value::Object(payload)).await?;
        let success: SuccessResult = res.json().await?;

        Ok(success)
    }

// Unimplemented
/*    pub async fn get_messages(&self, uuid: &str) -> Result<JuliaUser, Box<dyn std::error::Error>> {
        let timestamp = Self::get_timestamp();
        let message = format!("{}{}", timestamp, uuid);
        let signature = self.sessionless.sign(&message).to_hex();
 
        let url = format!("{}messages/user/{}?timestamp={}&signature={}", self.base_url, uuid, timestamp, signature);
        let res = self.get(&url).await?;
        let messages: Messages = res.json().await?;

        Ok(messages)
    }
*/

    pub async fn delete_user(&self, uuid: &str) -> Result<SuccessResult, Box<dyn std::error::Error>> {
        let timestamp = Self::get_timestamp();
        let message = format!("{}{}", timestamp, uuid);
        let signature = self.sessionless.sign(&message).to_hex();

        let payload = json!({
          "timestamp": timestamp,
          "uuid": uuid,
          "signature": signature
        }).as_object().unwrap().clone();

        let url = format!("{}user/{}", self.base_url, uuid);
        let res = self.delete(&url, serde_json::Value::Object(payload)).await?;
        let success: SuccessResult = res.json().await?;

        Ok(success)
    }

}
