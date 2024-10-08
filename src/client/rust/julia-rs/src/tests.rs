use crate::{JuliaUser, Julia};
use sessionless::hex::IntoHex;

#[actix_rt::test]
async fn test_julia() {

    let mut saved_user: JuliaUser;
    let mut saved_user2: JuliaUser;
    let julia = Julia::new(Some("http://localhost:3000/".to_string()));

    #[actix_rt::test]
    async fn create_user(julia: &Julia) {
    println!("creating user");
        let public_key = julia.sessionless.public_key().to_hex();
	let handle = "handle".to_string();
	let julia_user = JuliaUser::new(public_key, handle);
	let result = julia.create_user(julia_user).await;
    println!("got to here");

	match result {
	    Ok(user) => {
		saved_user = user;
		println!("Successfully got JuliaUser: {}", user.uuid);
		assert_eq!(
		    user.uuid.len(),
		    36
		);
	    },
	    Err(error) => {
		eprintln!("Error occurred: {}", error);
		println!("Error details: {:?}", error);
	    }
	}
    }

    #[actix_rt::test]
    async fn create_user2() {
    println!("creating user2");
	let handle = "handle".to_string();
	let julia_user = JuliaUser::new(julia.sessionless.public_key().to_hex(), handle);
	let result = julia.create_user(julia_user).await;
    println!("got to here");

	match result {
	    Ok(user) => {
		saved_user2 = user;
		println!("Successfully got JuliaUser: {}", user.uuid);
		assert_eq!(
		    user.uuid.len(),
		    36
		);
	    },
	    Err(error) => {
		eprintln!("Error occurred: {}", error);
		println!("Error details: {:?}", error);
	    }
	}
    }

    #[actix_rt::test]
    async fn get_user() {
	let result = julia.get_user(saved_user.uuid); 
     
	match result {
	    Ok(user) => {
		assert_eq!(
		    user.uuid.len(),
		    36
		);
	    }
	    Err(error) => {
		eprintln!("Error occurred: {}", error);
		println!("Error details: {:?}", error);
	    }
	} 
    }

    #[actix_rt::test]
    async fn get_prompt() {
	let result = julia.get_prompt(saved_user.uuid);         
     
	match result {
	    Ok(user) => {
		assert_eq!(
		    user.pending_prompts.len(),
		    1
		);
	    }
	    Err(error) => {
		eprintln!("Error occurred: {}", error);
		println!("Error details: {:?}", error);
	    }
	} 
    }

    #[actix_rt::test]
    async fn sign_prompt() {
	let result = julia.sign_prompt(saved_user2.uuid, saved_user.pending_prompts[0].prompt);         
     
	match result {
	    Ok(user) => {
		assert_eq!(
		    user.pending_prompts[0].new_uuid.len(),
		    36
		);
	    }
	    Err(error) => {
		eprintln!("Error occurred: {}", error);
		println!("Error details: {:?}", error);
	    }
	} 
    }

    #[actix_rt::test]
    async fn associate() {
	let result = julia.associate(saved_user.uuid, saved_user.pending_prompts[0]);
     
	match result {
	    Ok(user) => {
		assert_eq!(
		    user.keys.interactingKeys.len(),
		    1
		);   
	    }
	    Err(error) => {
		eprintln!("Error occurred: {}", error);
		println!("Error details: {:?}", error);
	    }
	}
    }

    #[actix_rt::test]
    async fn post_message() {
	let result = julia.post_message(saved_user.uuid, saved_user2.uuid, "Here is a test message".to_string());
     
	match result {
	    Ok(success) => {
		assert_eq!(
		    success.success,
		    true
		);
	    }
	    Err(error) => {
		eprintln!("Error occurred: {}", error);
		println!("Error details: {:?}", error);
	    }
	}
    }

    #[actix_rt::test]
    async fn delete_key() {
	let result = julia.delete_key(saved_user.uuid, saved_user2.uuid);
     
	match result {
	    Ok(user) => {
		assert_eq!(
		    user.keys.interactingKeys.len(),
		    0
		);
	    }
	    Err(error) => {
		eprintln!("Error occurred: {}", error);
		println!("Error details: {:?}", error);
	    }
	}
    }


    #[actix_rt::test]
    async fn delete_user() {
	let result = julia.delete_user(saved_user.uuid);

	match result {
	    Ok(success) => {
	       assert_eq!(
		    success.success,
		    true
		); 
	    }
	    Err(error) => {
		eprintln!("Error occurred: {}", error);
		println!("Error details: {:?}", error);
	    }
	}
    }

    create_user(&julia);
    create_user2();
    get_user();
    get_prompt();
    sign_prompt();
    associate();
    post_message();
    delete_key();
    delete_user();
}
