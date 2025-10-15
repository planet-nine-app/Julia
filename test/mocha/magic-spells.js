import { should } from 'chai';
should();
import sessionless from 'sessionless-node';
import fount from 'fount-js';

const baseURL = process.env.SUB_DOMAIN ? `https://${process.env.SUB_DOMAIN}.fount.allyabase.com/` : 'http://127.0.0.1:3006/';
fount.baseURL = baseURL;

let keys = {};
let fountUser = {};
let user1 = {};
let user2 = {};

describe('Julia MAGIC Spell Tests', () => {

  before(async () => {
    // Generate keys for testing
    keys = await sessionless.generateKeys(() => { return keys; }, () => { return keys; });

    // Create fount user for spell casting
    fountUser = await fount.createUser(() => keys, () => keys);
    console.log('Created fount user:', fountUser.uuid);
  });

  it('should create user via juliaUserCreate spell', async () => {
    const timestamp = Date.now().toString();

    const userData = {
      pubKey: keys.pubKey,
      keys: {interactingKeys: {}, coordinatingKeys: {}}
    };

    const spell = {
      spell: 'juliaUserCreate',
      casterUUID: fountUser.uuid,
      timestamp,
      totalCost: 50,
      mp: true,
      ordinal: 0,
      components: {
        user: userData
      }
    };

    // Sign the spell
    const message = timestamp + spell.spell + spell.casterUUID + spell.totalCost + spell.mp + spell.ordinal;
    spell.casterSignature = await sessionless.sign(message);

    // Cast the spell
    const result = await fount.castSpell('juliaUserCreate', spell);

    console.log('juliaUserCreate result:', result);

    result.should.have.property('success', true);
    result.should.have.property('user');
    result.user.should.have.property('uuid');
    result.user.should.have.property('pubKey', keys.pubKey);

    user1 = result.user;
  });

  it('should create second user for association tests', async () => {
    const timestamp = Date.now().toString();

    // Generate second set of keys
    const keys2 = {};
    await sessionless.generateKeys(() => keys2, () => keys2);

    const userData = {
      pubKey: keys2.pubKey,
      keys: {interactingKeys: {}, coordinatingKeys: {}}
    };

    const spell = {
      spell: 'juliaUserCreate',
      casterUUID: fountUser.uuid,
      timestamp,
      totalCost: 50,
      mp: true,
      ordinal: 1,
      components: {
        user: userData
      }
    };

    const message = timestamp + spell.spell + spell.casterUUID + spell.totalCost + spell.mp + spell.ordinal;
    spell.casterSignature = await sessionless.sign(message);

    const result = await fount.castSpell('juliaUserCreate', spell);

    result.should.have.property('success', true);
    result.should.have.property('user');

    user2 = result.user;
  });

  it('should save signed prompt via juliaUserAssociateSignedPrompt spell', async () => {
    const timestamp = Date.now().toString();

    const testPrompt = 'test-association-prompt';

    const spell = {
      spell: 'juliaUserAssociateSignedPrompt',
      casterUUID: fountUser.uuid,
      timestamp,
      totalCost: 50,
      mp: true,
      ordinal: 2,
      components: {
        uuid: user1.uuid,
        pubKey: keys.pubKey,
        prompt: testPrompt
      }
    };

    const message = timestamp + spell.spell + spell.casterUUID + spell.totalCost + spell.mp + spell.ordinal;
    spell.casterSignature = await sessionless.sign(message);

    const result = await fount.castSpell('juliaUserAssociateSignedPrompt', spell);

    console.log('juliaUserAssociateSignedPrompt result:', result);

    result.should.have.property('success', true);
  });

  it('should send message via juliaMessage spell', async () => {
    const timestamp = Date.now().toString();

    const testMessage = 'Hello from MAGIC spell test!';

    const spell = {
      spell: 'juliaMessage',
      casterUUID: fountUser.uuid,
      timestamp,
      totalCost: 50,
      mp: true,
      ordinal: 3,
      components: {
        senderUUID: user1.uuid,
        receiverUUID: user2.uuid,
        message: testMessage
      }
    };

    const message = timestamp + spell.spell + spell.casterUUID + spell.totalCost + spell.mp + spell.ordinal;
    spell.casterSignature = await sessionless.sign(message);

    const result = await fount.castSpell('juliaMessage', spell);

    console.log('juliaMessage result:', result);

    result.should.have.property('success', true);
  });

  it('should coordinate keys via juliaUserCoordinate spell', async () => {
    const timestamp = Date.now().toString();

    const coordinatingKeys = {};
    await sessionless.generateKeys(() => coordinatingKeys, () => coordinatingKeys);

    const spell = {
      spell: 'juliaUserCoordinate',
      casterUUID: fountUser.uuid,
      timestamp,
      totalCost: 50,
      mp: true,
      ordinal: 4,
      components: {
        primaryUUID: user1.uuid,
        coordinatingPubKey: coordinatingKeys.pubKey,
        coordinatingUuid: user2.uuid
      }
    };

    const message = timestamp + spell.spell + spell.casterUUID + spell.totalCost + spell.mp + spell.ordinal;
    spell.casterSignature = await sessionless.sign(message);

    const result = await fount.castSpell('juliaUserCoordinate', spell);

    console.log('juliaUserCoordinate result:', result);

    result.should.have.property('success', true);
    result.should.have.property('coordinatingKeys');
  });

  it('should verify NFC key via juliaNfcVerify spell', async () => {
    const timestamp = Date.now().toString();

    const nfcKeys = {};
    await sessionless.generateKeys(() => nfcKeys, () => nfcKeys);

    const bdoMessage = 'nfc-verification-message';

    const spell = {
      spell: 'juliaNfcVerify',
      casterUUID: fountUser.uuid,
      timestamp,
      totalCost: 50,
      mp: true,
      ordinal: 5,
      components: {
        primaryUUID: user1.uuid,
        pubKey: nfcKeys.pubKey,
        bdoMessage: bdoMessage,
        isCoordinating: false
      }
    };

    const message = timestamp + spell.spell + spell.casterUUID + spell.totalCost + spell.mp + spell.ordinal;
    spell.casterSignature = await sessionless.sign(message);

    const result = await fount.castSpell('juliaNfcVerify', spell);

    console.log('juliaNfcVerify result:', result);

    result.should.have.property('success', true);
    result.should.have.property('keyType');
    result.keyType.should.equal('interacting');
  });

  it('should delete user via juliaUserDelete spell', async () => {
    const timestamp = Date.now().toString();

    const spell = {
      spell: 'juliaUserDelete',
      casterUUID: fountUser.uuid,
      timestamp,
      totalCost: 50,
      mp: true,
      ordinal: 6,
      components: {
        uuid: user2.uuid
      }
    };

    const message = timestamp + spell.spell + spell.casterUUID + spell.totalCost + spell.mp + spell.ordinal;
    spell.casterSignature = await sessionless.sign(message);

    const result = await fount.castSpell('juliaUserDelete', spell);

    console.log('juliaUserDelete result:', result);

    result.should.have.property('success', true);
  });

  it('should fail to create user with missing pubKey', async () => {
    const timestamp = Date.now().toString();

    const spell = {
      spell: 'juliaUserCreate',
      casterUUID: fountUser.uuid,
      timestamp,
      totalCost: 50,
      mp: true,
      ordinal: 7,
      components: {
        user: {
          // Missing pubKey
          keys: {}
        }
      }
    };

    const message = timestamp + spell.spell + spell.casterUUID + spell.totalCost + spell.mp + spell.ordinal;
    spell.casterSignature = await sessionless.sign(message);

    const result = await fount.castSpell('juliaUserCreate', spell);

    result.should.have.property('success', false);
    result.should.have.property('error');
  });

  it('should fail to send message with missing fields', async () => {
    const timestamp = Date.now().toString();

    const spell = {
      spell: 'juliaMessage',
      casterUUID: fountUser.uuid,
      timestamp,
      totalCost: 50,
      mp: true,
      ordinal: 8,
      components: {
        senderUUID: user1.uuid
        // Missing receiverUUID and message
      }
    };

    const message = timestamp + spell.spell + spell.casterUUID + spell.totalCost + spell.mp + spell.ordinal;
    spell.casterSignature = await sessionless.sign(message);

    const result = await fount.castSpell('juliaMessage', spell);

    result.should.have.property('success', false);
    result.should.have.property('error');
  });

  it('should fail to coordinate keys with missing fields', async () => {
    const timestamp = Date.now().toString();

    const spell = {
      spell: 'juliaUserCoordinate',
      casterUUID: fountUser.uuid,
      timestamp,
      totalCost: 50,
      mp: true,
      ordinal: 9,
      components: {
        primaryUUID: user1.uuid
        // Missing coordinatingPubKey and coordinatingUuid
      }
    };

    const message = timestamp + spell.spell + spell.casterUUID + spell.totalCost + spell.mp + spell.ordinal;
    spell.casterSignature = await sessionless.sign(message);

    const result = await fount.castSpell('juliaUserCoordinate', spell);

    result.should.have.property('success', false);
    result.should.have.property('error');
  });

});
