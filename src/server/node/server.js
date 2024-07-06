import config from './config/local.js';
import express from 'express';
import user from './src/user/user.js';
import associate from './src/associate/associate.js';
import messaging from './src/messaging/messaging.js';
import sessionless from 'sessionless-node';

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const requestTime = +req.query.timestamp || +req.body.timestamp;
  const now = new Date().getTime();
  if(Math.abs(now - requestTime) > config.allowedTimeDifference) {
console.log('time bounced');
    return res.send(new Error('no time like the present'));
  }
  next();
});

app.use((req, res, next) => {
  const isGet = req.method === 'GET';
  const uuid = isGet ? req.params.uuid : req.body.uuid;
  req.user = user.getUser(uuid);
  next();
});

app.put('/user/create', async (req, res) => {
  const pubKey = req.body.pubKey;
  const message = req.body.timestamp +  pubKey;
  const signature = req.body.signature;
  
  if(!signature || !sessionless.verifySignature(signature, message, pubKey)) {
    res.status(403);
    return res.send({error: 'auth error'});
  }

  const foundUser = await user.putUser(pubKey, req.body.user);
  res.send(foundUser);
});

app.get('/user/:uuid', async (req, res) => {
  const uuid = req.params.uuid;
  const timestamp = req.query.timestamp;
  const signature = req.query.signature;
  const message = timestamp + uuid;

  if(!signature || !sessionless.verifySignature(signature, message, req.user.pubKey)) {
    res.status(403);
    return res.send({error: 'auth error'});
  }

  res.send(user);
});

app.get('/user/:uuid/associate/prompt', async (req, res) => {
  const uuid = req.params.uuid;
  const timestamp = req.query.timestamp;
  const signature = req.query.signature;
  const message = timestamp + uuid;

  if(!signature || !sessionless.verifySignature(signature, message, req.user.pubKey)) {
    res.status(403);
    return res.send({error: 'auth error'});
  }

  const prompt = await associate.getPrompt(user);

  res.send(prompt);
});

app.post('/user/:uuid/associate/signedPrompt', async (req, res) => {
  const uuid = req.params.uuid;
  const timestamp = req.body.timestamp;
  const pubKey = req.body.pubKey;
  const prompt = req.body.prompt;
  const signature = req.body.signature;
  const message = timestamp + uuid + pubKey + prompt;

  if(!signature || !sessionless.associate(signature, message, req.user.pubKey, newSignature, message, newPubKey)) {
    res.status(403);
    return res.send({error: 'auth error'});
  }
  
  const result = await associate.saveSignedPrompt(req.user, req.body);
  res.send({success: result});
});

app.post('/user/:uuid/associate', async (req, res) => {
  const uuid = req.params.uuid;
  const timestamp = req.body.timestamp;
  const newUUID = req.body.newUUID;
  const newPubKey = req.body.newPubKey;
  const prompt = req.body.prompt;
  const signature = req.body.signature;
  const newSignature = req.body.newSignature;
  const message = timestamp + uuid + newUUID + newPubKey + prompt;

  if(!signature || !sessionless.associate(signature, message, req.user.pubKey, newSignature, message, newPubKey)) {
    res.status(403);
    return res.send({error: 'auth error'});
  } 

  const associatedUser = await getUser(newUUID);
  const updatedUser = await associate.associate(req.user, associatedUser);

  res.send(updatedUser);
});

app.delete('/associated/:associatedUUID/user/:uuid', async (req, res) => {
  const associatedUUID = req.params.associatedUUID;
  const uuid = req.params.uuid;
  const timestamp = req.body.timestamp;
  const signature = req.body.signature;
  const message = timestamp + associatedUUID + uuid;

  if(!signature || !sessionless.verifySignature(signature, message, req.user.pubKey)) {
    res.status(403);
    return res.send({error: 'auth error'});
  }

  const associatedUser = await getUser(associatedUUID);
  const association = await associate.deleteAssociation(req.user, associatedUser);

  res.send(association);
});

app.delete('/user/:uuid', async (req, res) => {
  const uuid = req.params.uuid;
  const timestamp = req.body.timestamp;
  const signature = req.body.signature;
  const message = timestamp + uuid;

  if(!signature || !sessionless.verifySignature(signature, message, req.user.pubKey)) {
    res.status(403);
    return res.send({error: 'auth error'});
  }

  const result = await user.deleteUser(req.user);
  
  res.send({success: result});
});

app.post('/message', async (req, res) => {
  const timestamp = req.body.timestamp;
  const senderUUID = req.body.senderUUID;
  const receiverUUID = req.body.receiverUUID;
  const message = req.body.message;
  const signature = req.body.signature;
  const msg = timestamp + senderUUID + receiverUUID;

  if(!signature || !sessionless.verifySignature(signature, msg, req.user.pubKey)) {
    res.status(403);
    return res.send({error: 'auth error'});
  }

  const sender = req.user;
  const receiver = await getUser(receiverUUID);

  const result = await messaging.messageUser(sender, receiver, message);

  res.send({success: result});
});

app.get('/messages/user/:uuid', async (req, res) => {
  const timestamp = req.query.timestamp;
  const uuid = req.params.uuid;
  const siganture = req.query.signature;
  const message = timestamp + uuid;

  if(!signature || !sessionless.verifySignature(signature, msg, req.user.pubKey)) {
    res.status(403);
    return res.send({error: 'auth error'});
  }

  const messages = await messaging.getMessages(req.user);
  res.send(messages);
});

app.listen(3000);

console.log('server listening on port 3000');
