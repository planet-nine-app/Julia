use reqwest::{Client, Response};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sessionless::{Sessionless, Signature};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize)]
pub struct JuliaUser {
    pub_key: String,
    // Add other fields as needed
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

    pub async fn create_user(&self, optional_user: Option<JuliaUser>) -> Result<JuliaUser, Box<dyn std::error::Error>> {
        let keys = self.sessionless.generate_keys().await?;
        let timestamp = Self::get_timestamp();
        
        let payload = json!({
            "timestamp": timestamp,
            "pubKey": keys.pub_key,
            "user": optional_user.unwrap_or(JuliaUser { pub_key: keys.pub_key.clone() })
        });

        let signature = self.sessionless.sign(&format!("{}{}", timestamp, keys.pub_key)).await?;
        let mut payload = payload.as_object().unwrap().clone();
        payload.insert("signature".to_string(), json!(signature));

        let url = format!("{}user/create", self.base_url);
        let res = self.put(&url, serde_json::Value::Object(payload)).await?;
        let user: JuliaUser = res.json().await?;

        Ok(user)
    }

    pub async fn get_user(&self, uuid: &str) -> Result<JuliaUser, Box<dyn std::error::Error>> {
        let timestamp = Self::get_timestamp();
        let message = format!("{}{}", timestamp, uuid);
        let signature = self.sessionless.sign(&message).await?;

        let url = format!("{}user/{}?timestamp={}&signature={}", self.base_url, uuid, timestamp, signature);
        let res = self.get(&url).await?;
        let user: JuliaUser = res.json().await?;

        Ok(user)
    }

    pub async fn get_prompt(&self, uuid: &str) -> Result<JuliaUser, Box<dyn std::error::Error>> {
        let timestamp = Self::get_timestamp();
        let message = format!("{}{}", timestamp, uuid);
        let signature = self.sessionless.sign(&message).await?;

        let url = format!("{}user/{}/associate/prompt?timestamp={}&signature={}", self.base_url, uuid, timestamp, signature);
        let res = self.get(&url).await?;
        let user: JuliaUser = res.json().await?;

        Ok(user)
    }

    pub async fn sign_prompt(&self, uuid: &str, prompt: &Prompt) -> Result<JuliaUser, Box<dyn std::error::Error>> {
        let pub_key = self.sessionless.public_key;
        let timestamp = Self::get_timestamp();

        let message = format!("{}{}{}{}", timestamp, uuid, pub_key, prompt);
        let signature = self.sessionless.sign(&message).await?;

        let payload = json!({
            "timestamp": timestamp,
            "uuid": uuid,
            "pubKey": pub_key,
            "prompt": prompt,
            "signature": signature
        });

        let url = format!("{}user/{}/associate/signedPrompt", self.base_url, uuid);
        let res = self.post(url, serde_json::Value::Object(payload)).await?;
        let user: JuliaUser = res.json().await?;

        Ok(user);
    }

    pub async fn associate(&self, uuid: &str, signedPrompt: &Prompt) -> Result<JuliaUser, Box<dyn std::error::Error>> {
        let timestamp = Self::get_timestamp();
        let message = format!("{}{}{}{}", signedPrompt.new_timestamp, signedPrompt.new_uuid, signedPrompt.new_pub_key, signedPrompt.prompt);
        let signature = self.sessionless.sign(&message).await?;

        let payload = json!({
            "timestamp": timestamp,
            "newTimestamp": signedPrompt.new_timestamp,
            "newUUID": signedPrompt.new_uuid,
            "newPubKey": signedPrompt.new_pub_key,
            "newSignature": signedPrompt.new_signature,
            "prompt": signedPrompt.prompt,
            "signature": signature
        });

        let url = format!("{}user/{}/associate", self.base_url, uuid);
        let res = self.post(url, serde_json::Value::Object(payload)).await?;
        let user: JuliaUser = res.json().await?;

        Ok(user);
    }

    pub async fn delete_key(&self, uuid: &str, associated_uuid: &str) -> Result<JuliaUser, Box<dyn std::error::Error>> {
        let timestamp = Self::get_timestamp();
        let message = format!("{}{}{}", timestamp, associated_uuid, uuid);
        let signature = self.sessionless.sign(&message).await?;

        let payload = json!({
            "timestamp": timestamp,
            "signature": signature
        });

        let url = format!("{}associated/{}/user/{}", self.base_url, associated_uuid, uuid);
        let res = self.delete(url, payload);
        let user: JuliaUser = res.json().await?;
            
        Ok(user);
    }

    pub async fn post_message(&self, uuid: &str, receiver_uuid: &str, contents: String) -> Result<SuccessResult, Box<dyn std::error::Error>> {
        let timestamp = Self::get_timestamp();
        let message = format!("{}{}{}{}", timestamp, uuid, receiver_uuid, contents);
        let signature = self.sessionless.sign(&message).await?;

        let payload = json!({
            "timestamp": timestamp,
            "senderUUID": uuid,
            "receiverUUID": receiver_uuid,
            "message": contents
        });

        let url = format!("{}message", self.base_url);
        let res = self.post(url, serde_json::Value::Object(payload)).await?;
        let success: SuccessResult = res.json().await?;

        Ok(success);
    }

    pub async fn get_messages(&self, uuid: &str) -> Result<JuliaUser, Box<dyn std::error::Error>> {
        let timestamp = Self::get_timestamp();
        let message = format!("{}{}", timestamp, uuid);
        let signature = self.sessionless.sign(&message).await?;
 
        let url = format!("{}messages/user/{}?timestamp={}&signature={}", self.base_url, uuid, timestamp, signature);
        let res = self.get(url);
        let messages: Messages = res.json().await?;

        Ok(messages);
    }

    pub async fn delete_user(&self, uuid: &str) -> Result<SuccessResult, Box<dyn std::error::Error>> {
        let timestamp = Self::get_timestamp();
        let message = format!("{}{}", timestamp, uuid);
        let signature = self.sessionless.sign(&message).await?;

        let payload = json!({
          "timestamp": timestamp,
          "uuid": uuid,
          "signature": signature
        });

        let url = format!("{}user/{}", self.base_url, uuid);
        let res = self.delete(url, serde_json::Value::Object(payload)).await?;
        let success = SuccessResult::success();

        OK(success);
    }

}
