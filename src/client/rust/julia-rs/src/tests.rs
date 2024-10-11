use crate::{JuliaUser, Julia, Prompt};
use sessionless::hex::IntoHex;

#[actix_rt::test]
async fn test_julia() {

    let mut saved_user: Option<JuliaUser> = Some(JuliaUser::new("foo".to_string(), "bar".to_string()));
    let mut saved_user2: Option<JuliaUser> = Some(JuliaUser::new("foo".to_string(), "bar".to_string()));
    let julia = Julia::new(Some("http://localhost:3000/".to_string()));
    let julia2 = Julia::new(Some("http://localhost:3000/".to_string()));

    async fn create_user(julia: &Julia, saved_user: &JuliaUser) -> Option<JuliaUser> {
    println!("creating user");
        let public_key = julia.sessionless.public_key().to_hex();
	let handle = "handle1".to_string();
	let julia_user = JuliaUser::new(public_key, handle);
	let result = julia.create_user(julia_user).await;
    println!("got to here");

	match result {
	    Ok(user) => {
		println!("Successfully got JuliaUser: {}", user.uuid);
		assert_eq!(
		    user.uuid.len(),
		    36
		);
                Some(user)
	    },
	    Err(error) => {
		eprintln!("Error occurred create_user: {}", error);
		println!("Error details: {:?}", error);
                None
	    }
	}
    }

    async fn create_user2(julia: &Julia, saved_user2: &JuliaUser) -> Option<JuliaUser> {
    println!("creating user2");
	let handle = "handle2".to_string();
	let julia_user = JuliaUser::new(julia.sessionless.public_key().to_hex(), handle);
	let result = julia.create_user(julia_user).await;
    println!("got to here");

	match result {
	    Ok(user) => {
		println!("Successfully got JuliaUser: {}", user.uuid);
		assert_eq!(
		    user.uuid.len(),
		    36
		);
                Some(user)
	    },
	    Err(error) => {
		eprintln!("Error occurred create_user2: {}", error);
		println!("Error details: {:?}", error);
                None
	    }
	}
    }

    async fn get_user(julia: &Julia, saved_user: &JuliaUser) -> Option<JuliaUser> {
	let result = julia.get_user(&saved_user.uuid).await; 
     
	match result {
	    Ok(user) => {
		assert_eq!(
		    user.uuid.len(),
		    36
		);
                Some(user)
	    }
	    Err(error) => {
		eprintln!("Error occurred get_user: {}", error);
		println!("Error details: {:?}", error);
                None
	    }
	} 
    }

    async fn get_prompt(julia: &Julia, saved_user: &JuliaUser) -> Option<JuliaUser> {
	let result = julia.get_prompt(&saved_user.uuid).await;         
     
	match result {
	    Ok(user) => {
		assert_eq!(
		    user.pending_prompts.len(),
		    1
		);
                Some(user)
	    }
	    Err(error) => {
		eprintln!("Error occurred get_prompt: {}", error);
		println!("Error details: {:?}", error);
                None
	    }
	} 
    }

    async fn sign_prompt(julia: &Julia, julia2: &Julia, saved_user: &JuliaUser, saved_user2: &JuliaUser) -> Option<JuliaUser> {
        let pending_prompts: Vec<Prompt> = saved_user.pending_prompts.values().cloned().collect();
	let result = julia2.sign_prompt(&saved_user2.uuid, &pending_prompts[0]).await; 
        let updated_user = julia.get_user(&saved_user.uuid).await;
     
	match updated_user {
	    Ok(user) => {
                let updated_prompts: Vec<Prompt> = user.pending_prompts.values().cloned().collect();
                let formatted = format!("{:?}", updated_prompts[0].new_uuid);
		assert_eq!(
		    formatted.len(),
		    44
		);
                Some(user)
	    }
	    Err(error) => {
		eprintln!("Error occurred sign_prompt: {}", error);
		println!("Error details: {:?}", error);
                None
	    }
	} 
    }

    async fn associate(julia: &Julia, saved_user: &JuliaUser) -> Option<JuliaUser> {
        let pending_prompts: Vec<Prompt> = saved_user.pending_prompts.values().cloned().collect();
	let result = julia.associate(&saved_user.uuid, &pending_prompts[0]).await;
     
	match result {
	    Ok(user) => {
		assert_eq!(
		    user.keys["interactingKeys"].len(),
		    2
		);   
                Some(user)
	    }
	    Err(error) => {
		eprintln!("Error occurred associate: {}", error);
		println!("Error details: {:?}", error);
                None
	    }
	}
    }

    async fn post_message(julia: &Julia, saved_user: &JuliaUser, saved_user2: &JuliaUser) {
	let result = julia.post_message(&saved_user.uuid, &saved_user2.uuid, "Here is a test message".to_string()).await;
     
	match result {
	    Ok(success) => {
		assert_eq!(
		    success.success,
		    true
		);
	    }
	    Err(error) => {
		eprintln!("Error occurred post_message: {}", error);
		println!("Error details: {:?}", error);
	    }
	}
    }

    async fn delete_key(julia: &Julia, saved_user: &JuliaUser, saved_user2: &JuliaUser) -> Option<JuliaUser> {
	let result = julia.delete_key(&saved_user.uuid, &saved_user2.uuid).await;
     
	match result {
	    Ok(user) => {
		assert_eq!(
		    user.keys["interactingKeys"].len(),
		    1
		);
                Some(user)
	    }
	    Err(error) => {
		eprintln!("Error occurred delete_key: {}", error);
		println!("Error details: {:?}", error);
                None
	    }
	}
    }


    async fn delete_user(julia: &Julia, saved_user: &JuliaUser) {
	let result = julia.delete_user(&saved_user.uuid).await;

	match result {
	    Ok(success) => {
	       assert_eq!(
		    success.success,
		    true
		); 
	    }
	    Err(error) => {
		eprintln!("Error occurred delete_user: {}", error);
		println!("Error details: {:?}", error);
	    }
	}
    }

    if let Some(ref user) = saved_user {
        saved_user = Some(create_user(&julia, user).await.expect("user"));
    } else {    
        panic!("Failed to create user to begin with"); 
    }           
            
    if let Some(ref user) = saved_user2 {
        saved_user2 = Some(create_user2(&julia2, user).await.expect("user2"));
    } else {
        panic!("Failed to create user2");
    }

    if let Some(ref user) = saved_user2 {
        saved_user2 = Some(get_user(&julia2, user).await.expect("get user2 1"));
    } else {
        panic!("Failed to get user");
    }

    if let Some(ref user) = saved_user {
	saved_user = Some(get_prompt(&julia, user).await.expect("get prompt"));
    } else {
	panic!("Failed to get prompt");
    }

    if let (Some(ref user), Some(ref user2)) = (saved_user, saved_user2) {
        Some(sign_prompt(&julia, &julia2, user, user2).await);
        saved_user = Some(get_user(&julia, user).await.expect("get user after signing prompt"));
        saved_user2 = Some(get_user(&julia2, user2).await.expect("get user2"));
    } else { 
        panic!("Failed to sign prompt");
    } 

    if let (Some(ref user), Some(ref user2)) = (saved_user, saved_user2) {
        saved_user = Some(associate(&julia, user).await.expect("associate"));

        if let Some(ref user) = saved_user {
            post_message(&julia, user, user2).await;
        } else {
	    panic!("Failed to post message");
	} 
        
        if let Some(ref user) = saved_user {
            saved_user = Some(delete_key(&julia, user, user2).await.expect("delete_key"));
        } else {
	    panic!("Failed to delete key");
	} 

        if let Some(ref user) = saved_user {
            delete_user(&julia, &user).await;
        } else {
	    panic!("Failed to delete user");
	} 

    } else {
        panic!("Failed on associate");
    }

}
