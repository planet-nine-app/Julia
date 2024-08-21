import config from './config/local.js';
import express from 'express';
import user from './src/user/user.js';
import associate from './src/associate/associate.js';
import messaging from './src/messaging/messaging.js';
import sessionless from 'sessionless-node';

const sk = (keys) => {
  global.keys = keys;
};

const gk = () => {
  return keys;
};

sessionless.generateKeys(sk, gk);

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const requestTime = +req.query.timestamp || +req.body.timestamp;
  const now = new Date().getTime();
  if(Math.abs(now - requestTime) > config.allowedTimeDifference) {
    return res.send({error: 'no time like the present'});
  }
  next();
});

app.put('/user/create', async (req, res) => {
console.log(req.body);
  const pubKey = req.body.pubKey;
  const message = req.body.timestamp +  pubKey;
console.log(message);
  const signature = req.body.signature;
console.log(signature);
console.log(message);
console.log(pubKey);
console.log(typeof signature);
console.log(typeof message);
console.log(typeof pubKey);
console.log('foo');
  
  if(!signature || !sessionless.verifySignature(signature, message, pubKey)) {
    res.status(403);
    return res.send({error: 'auth error'});
  }
console.log('bar');

  const foundUser = await user.putUser(req.body.user);
console.log(`Sending back: ${JSON.stringify(foundUser)}`);
  res.send(foundUser);
});

app.get('/user/:uuid', async (req, res) => {
  const uuid = req.params.uuid;
  const timestamp = req.query.timestamp;
  const signature = req.query.signature;
  const message = timestamp + uuid;
 
  const foundUser = await user.getUser(req.params.uuid);

  if(!signature || !sessionless.verifySignature(signature, message, foundUser.pubKey)) {
    res.status(403);
    return res.send({error: 'auth error'});
  }

  res.send(foundUser);
});

app.get('/user/:uuid/associate/prompt', async (req, res) => {
  const uuid = req.params.uuid;
  const timestamp = req.query.timestamp;
  const signature = req.query.signature;
  const message = timestamp + uuid;

  const foundUser = await user.getUser(req.params.uuid);

  if(!signature || !sessionless.verifySignature(signature, message, foundUser.pubKey)) {
    res.status(403);
    return res.send({error: 'auth error'});
  }

  const userWithPrompt = await associate.getPrompt(foundUser);

console.log('\n\n\n');
console.log('Start with: ', userWithPrompt.pendingPrompts);
console.log('\n\n\n');

//console.log('sending back: ', userWithPrompt);

  res.send(userWithPrompt);
});

app.post('/user/:uuid/associate/signedPrompt', async (req, res) => {
//console.log('rew.body is', req.body);
console.log('\n\n\n');
console.log('signed prompt', req.body.prompt);
console.log('\n\n\n');
  const uuid = req.params.uuid;
  const timestamp = req.body.timestamp;
  const pubKey = req.body.pubKey;
  const prompt = req.body.prompt;
  const signature = req.body.signature;
  const message = timestamp + uuid + pubKey + prompt;
console.log(message);

  const foundUser = await user.getUser(req.params.uuid);

console.log('after found user');

  if(!signature || !sessionless.verifySignature(signature, message, foundUser.pubKey)) {
console.log('auth failed');
    res.status(403);
    return res.send({error: 'auth error'});
  }

console.log('uuid here is: ' + req.body.uuid);
  
  const result = await associate.saveSignedPrompt(foundUser, req.body);
console.log('should return success: ' + result);
  res.send({success: result});
});

app.post('/user/:uuid/associate', async (req, res) => {
console.log("\n\n\n\n\n\n");
console.log('associated prompt', req.body.prompt);
console.log("\n\n\n\n\n\n");
  const uuid = req.params.uuid;
  const newTimestamp = req.body.newTimestamp;
  const newUUID = req.body.newUUID;
  const newPubKey = req.body.newPubKey;
  const prompt = req.body.prompt;
  const signature = req.body.signature;
  const newSignature = req.body.newSignature;
  const message = newTimestamp + newUUID + newPubKey + prompt;

  const foundUser = await user.getUser(req.params.uuid);

  if(!foundUser.pendingPrompts[prompt] || 
     !(foundUser.pendingPrompts[prompt].prompter === foundUser.uuid && 
     foundUser.pendingPrompts[prompt].newUUID === newUUID)) {
console.log("first check failed");
    res.status(404);
    return res.send({error: 'prompt not found'});
  }

console.log('message here is: ' + message);

  if(!signature || !sessionless.associate(signature, message, foundUser.pubKey, newSignature, message, newPubKey)) {
console.log('association signatures failes');
console.log(signature);
console.log(newSignature);
console.log(foundUser.pubKey);
console.log(newPubKey);
    res.status(403);
    return res.send({error: 'auth error'});
  } 

  const associatedUser = await user.getUser(newUUID);
  const updatedUser = await associate.associate(foundUser, associatedUser);
  await associate.removePrompt(foundUser, prompt);
  const doubleUpdatedUser = await user.getUser(uuid);

console.log("sending back doubleUpdatedUser", doubleUpdatedUser);

  res.send(doubleUpdatedUser);
});

app.delete('/associated/:associatedUUID/user/:uuid', async (req, res) => {
  const associatedUUID = req.params.associatedUUID;
  const uuid = req.params.uuid;
  const timestamp = req.body.timestamp;
  const signature = req.body.signature;
  const message = timestamp + associatedUUID + uuid;

  const foundUser = await user.getUser(req.params.uuid);

  if(!signature || !sessionless.verifySignature(signature, message, foundUser.pubKey)) {
    res.status(403);
    return res.send({error: 'auth error'});
  }

  const associatedUser = await user.getUser(associatedUUID);
  const disassociated = await associate.deleteAssociation(foundUser, associatedUser);

  if(disassociated) {
console.log("disassociated!");
    const updatedUser = await user.getUser(req.params.uuid);
    return res.send(updatedUser);
  }
console.log("It failed");

  res.send(foundUser);
});

app.delete('/user/:uuid', async (req, res) => {
  const uuid = req.params.uuid;
  const timestamp = req.body.timestamp;
  const signature = req.body.signature;
  const message = timestamp + uuid;

  const foundUser = await user.getUser(req.params.uuid);

  if(!signature || !sessionless.verifySignature(signature, message, foundUser.pubKey)) {
    res.status(403);
    return res.send({error: 'auth error'});
  }

  const result = await user.deleteUser(foundUser);
  
  res.send({success: result});
});

app.post('/message', async (req, res) => {
  const timestamp = req.body.timestamp;
  const senderUUID = req.body.senderUUID;
  const receiverUUID = req.body.receiverUUID;
  const message = req.body.message;
  const signature = req.body.signature;
  const msg = timestamp + senderUUID + receiverUUID + message;

  const sender = await user.getUser(senderUUID);

console.log('got stuff');

  if(!signature || !sessionless.verifySignature(signature, msg, sender.pubKey)) {
console.log('auth error');
    res.status(403);
    return res.send({error: 'auth error'});
  }

  const receiver = await user.getUser(receiverUUID);
console.log('got receiver');

  if(!receiver) {
    return res.send({success: false});
  }

  const result = await messaging.messageUser(sender, receiver, req.body);

  res.send({success: result});
});

app.get('/messages/user/:uuid', async (req, res) => {
  const timestamp = req.query.timestamp;
  const uuid = req.params.uuid;
  const signature = req.query.signature;
  const message = timestamp + uuid;

  const foundUser = await user.getUser(req.params.uuid);

  if(!signature || !sessionless.verifySignature(signature, message, foundUser.pubKey)) {
    res.status(403);
    return res.send({error: 'auth error'});
  }

  const messages = await messaging.getMessages(foundUser);
  res.send({ messages });
});

app.listen(3000);

console.log('server listening on port 3000');
