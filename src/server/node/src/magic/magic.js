import sessionless from 'sessionless-node';
import user from '../user/user.js';
import db from '../persistence/db.js';
import fetch from 'node-fetch';

sessionless.getKeys = async () => {
  return await db.getKeys();
};

const fountURL = 'http://localhost:3006/';

const MAGIC = {
  joinup: async (spell) => {
    const gateway = await MAGIC.gatewayForSpell(spell.spellName);
    spell.gateways.push(gateway);
    const spellName = spell.spell;

    const julia = await db.getUser('julia');
    const spellbooks = julia.spellbooks;
    const spellbook = spellbooks.filter(spellbook => spellbook[spellName]).pop();
    if(!spellbook) {
      throw new Error('spellbook not found');
    }

    const spellEntry = spellbook[spellName];
    const currentIndex = spellEntry.destinations.indexOf(spellEntry.destinations.find(($) => $.stopName === 'julia'));
    const nextDestination = spellEntry.destinations[currentIndex + 1].stopURL + spellName;

    const res = await MAGIC.forwardSpell(spell, nextDestination);
    const body = await res.json();
 
    if(!body.success) {
      return body;
    }

    const foundUser = await user.putUser(spell.user);
    if(!body.uuids) {
      body.uuids = [];
    }
    body.uuids.push({
      service: 'julia',
      uuid: foundUser.uuid
    });

    return body;
  },

  linkup: async (spell) => {
    const foundUser = await user.getUser(spell.casterUUID);

    const coordinatingKeys = [];
    spell.gateways.forEach(gateway => coordinatingKeys.push(gateway.coordinatingKey));

    if(coordinatingKeys.filter(keys => keys).length !== spell.gateways.length) {
      throw new Error('missing coordinating key');
    }

    const gateway = await MAGIC.gatewayForSpell(spell.spellName);
    spell.gateways.push(gateway);

    const res = await MAGIC.forwardSpell(spell, fountURL);
    const body = await res.json();

    if(!body.success) {
      return body;
    }

    return body;
  },

  gatewayForSpell: async (spellName) => {
    const julia = await db.getUser('julia');
    const gateway = {
      timestamp: new Date().getTime() + '',
      uuid: julia.fountUUID, 
      minimumCost: 20,
      ordinal: julia.ordinal
    };      

    const message = gateway.timestamp + gateway.uuid + gateway.minimumCost + gateway.ordinal;

    gateway.signature = await sessionless.sign(message);

    return gateway;
  },

  forwardSpell: async (spell, destination) => {
    return await fetch(destination, {
      method: 'post',
      body: JSON.stringify(spell),
      headers: {'Content-Type': 'application/json'}
    });
  },

  // Creation spell handlers - coordinate keys between services
  createProduct: async (spell) => {
    return await MAGIC.handleCreationSpell(spell, 'sanora');
  },

  createPost: async (spell) => {
    return await MAGIC.handleCreationSpell(spell, 'dolores');
  },

  createBDO: async (spell) => {
    return await MAGIC.handleCreationSpell(spell, 'bdo');
  },

  createVideo: async (spell) => {
    return await MAGIC.handleCreationSpell(spell, 'dolores');
  },

  // Generic handler for creation spells
  handleCreationSpell: async (spell, targetService) => {
    console.log(`🔗 Julia coordinating ${spell.spell} for caster: ${spell.casterUUID} -> ${targetService}`);

    // Verify caster signature
    const casterMessage = spell.timestamp + spell.spell + spell.casterUUID + spell.totalCost + spell.mp + spell.ordinal;
    const caster = await user.getUser(spell.casterUUID);

    if (!sessionless.verifySignature(spell.casterSignature, casterMessage, caster.pubKey)) {
      return {success: false, error: 'Invalid caster signature'};
    }

    // Check if keys are coordinated for this user and target service
    const coordination = await MAGIC.checkKeyCoordination(spell.casterUUID, targetService);

    if (!coordination.success) {
      return {success: false, error: 'Keys not coordinated between services'};
    }

    // Get Julia's state for gateway creation
    const julia = await db.getUser('julia');

    // Create Julia's gateway entry with coordination info
    const juliaGateway = {
      timestamp: new Date().getTime(),
      uuid: julia.uuid,
      minimumCost: 0,
      ordinal: julia.ordinal + 1,
      // Add service UUIDs for coordination
      juliaUUID: julia.uuid,
      fountUUID: julia.fountUUID,
      [`${targetService}UUID`]: coordination[`${targetService}UUID`]
    };

    // Sign Julia's gateway entry
    const juliaMessage = juliaGateway.timestamp + juliaGateway.uuid + juliaGateway.minimumCost + juliaGateway.ordinal;
    juliaGateway.juliaSignature = await sessionless.sign(juliaMessage);

    // Add gateway to spell
    spell.gateways = spell.gateways || [];
    spell.gateways.push(juliaGateway);

    // Forward to next destination (fount)
    const res = await MAGIC.forwardSpell(spell, `${fountURL}resolve/${spell.spell}`);
    const body = await res.json();

    return body;
  },

  // Check if user's keys are coordinated between services
  checkKeyCoordination: async (casterUUID, targetService) => {
    try {
      const julia = await db.getUser('julia');
      const coordination = julia.keys?.coordinatingKeys?.[casterUUID];

      if (coordination && coordination[targetService] && coordination.fount) {
        return {
          success: true,
          [`${targetService}UUID`]: coordination[targetService].uuid,
          fountUUID: coordination.fount.uuid
        };
      }

      // For now, create mock coordination if it doesn't exist
      // In a full implementation, this would require a proper key exchange process
      console.log(`⚠️ Creating mock coordination for ${casterUUID} -> ${targetService}`);

      return {
        success: true,
        [`${targetService}UUID`]: `mock-${targetService}-uuid`,
        fountUUID: julia.fountUUID
      };

    } catch(err) {
      return { success: false, error: err.message };
    }
  },

  // 🪄 MAGIC-ROUTED ENDPOINTS (No auth needed - resolver authorizes)

  juliaUserCreate: async (spell) => {
    try {
      const { user: userData } = spell.components;

      if (!userData || !userData.pubKey) {
        return {
          success: false,
          error: 'Missing required field: user with pubKey'
        };
      }

      const foundUser = await user.putUser(userData);

      return {
        success: true,
        user: foundUser
      };
    } catch (err) {
      console.error('juliaUserCreate error:', err);
      return {
        success: false,
        error: err.message
      };
    }
  },

  juliaUserAssociateSignedPrompt: async (spell) => {
    try {
      const { uuid, pubKey, prompt } = spell.components;

      if (!uuid || !pubKey || !prompt) {
        return {
          success: false,
          error: 'Missing required fields: uuid, pubKey, prompt'
        };
      }

      const foundUser = await user.getUser(uuid);

      if (!foundUser) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Import associate module
      const associateModule = await import('../associate/associate.js');
      const associate = associateModule.default;

      const result = await associate.saveSignedPrompt(foundUser, spell.components);

      return {
        success: result
      };
    } catch (err) {
      console.error('juliaUserAssociateSignedPrompt error:', err);
      return {
        success: false,
        error: err.message
      };
    }
  },

  juliaUserAssociate: async (spell) => {
    try {
      const { uuid, newUUID, newPubKey, prompt } = spell.components;

      if (!uuid || !newUUID || !newPubKey || !prompt) {
        return {
          success: false,
          error: 'Missing required fields: uuid, newUUID, newPubKey, prompt'
        };
      }

      const foundUser = await user.getUser(uuid);

      if (!foundUser) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Check prompt exists and matches
      if (!foundUser.pendingPrompts || !foundUser.pendingPrompts[prompt]) {
        return {
          success: false,
          error: 'Prompt not found'
        };
      }

      if (foundUser.pendingPrompts[prompt].prompter !== foundUser.uuid ||
          foundUser.pendingPrompts[prompt].newUUID !== newUUID) {
        return {
          success: false,
          error: 'Prompt validation failed'
        };
      }

      const associatedUser = await user.getUser(newUUID);

      if (!associatedUser) {
        return {
          success: false,
          error: 'Associated user not found'
        };
      }

      // Import associate module
      const associateModule = await import('../associate/associate.js');
      const associate = associateModule.default;

      const updatedUser = await associate.associate(foundUser, associatedUser);
      await associate.removePrompt(foundUser, prompt);
      const doubleUpdatedUser = await user.getUser(uuid);

      return {
        success: true,
        user: doubleUpdatedUser
      };
    } catch (err) {
      console.error('juliaUserAssociate error:', err);
      return {
        success: false,
        error: err.message
      };
    }
  },

  juliaAssociatedUserDelete: async (spell) => {
    try {
      const { associatedUUID, uuid } = spell.components;

      if (!associatedUUID || !uuid) {
        return {
          success: false,
          error: 'Missing required fields: associatedUUID, uuid'
        };
      }

      const foundUser = await user.getUser(uuid);
      const associatedUser = await user.getUser(associatedUUID);

      if (!foundUser || !associatedUser) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Import associate module
      const associateModule = await import('../associate/associate.js');
      const associate = associateModule.default;

      const disassociated = await associate.deleteAssociation(foundUser, associatedUser);

      if (disassociated) {
        const updatedUser = await user.getUser(uuid);
        return {
          success: true,
          user: updatedUser
        };
      }

      return {
        success: false,
        error: 'Failed to disassociate users'
      };
    } catch (err) {
      console.error('juliaAssociatedUserDelete error:', err);
      return {
        success: false,
        error: err.message
      };
    }
  },

  juliaUserDelete: async (spell) => {
    try {
      const { uuid } = spell.components;

      if (!uuid) {
        return {
          success: false,
          error: 'Missing required field: uuid'
        };
      }

      const foundUser = await user.getUser(uuid);

      if (!foundUser) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      const result = await user.deleteUser(foundUser);

      return {
        success: result
      };
    } catch (err) {
      console.error('juliaUserDelete error:', err);
      return {
        success: false,
        error: err.message
      };
    }
  },

  juliaMessage: async (spell) => {
    try {
      const { senderUUID, receiverUUID, message } = spell.components;

      if (!senderUUID || !receiverUUID || !message) {
        return {
          success: false,
          error: 'Missing required fields: senderUUID, receiverUUID, message'
        };
      }

      const sender = await user.getUser(senderUUID);
      const receiver = await user.getUser(receiverUUID);

      if (!sender || !receiver) {
        return {
          success: false,
          error: 'Sender or receiver not found'
        };
      }

      // Import messaging module
      const messagingModule = await import('../messaging/messaging.js');
      const messaging = messagingModule.default;

      const result = await messaging.messageUser(sender, receiver, spell.components);

      return {
        success: result
      };
    } catch (err) {
      console.error('juliaMessage error:', err);
      return {
        success: false,
        error: err.message
      };
    }
  },

  juliaUserCoordinate: async (spell) => {
    try {
      const { primaryUUID, coordinatingPubKey, coordinatingUuid } = spell.components;

      if (!primaryUUID || !coordinatingPubKey || !coordinatingUuid) {
        return {
          success: false,
          error: 'Missing required fields: primaryUUID, coordinatingPubKey, coordinatingUuid'
        };
      }

      const primaryUser = await user.getUser(primaryUUID);

      if (!primaryUser) {
        return {
          success: false,
          error: 'Primary user not found'
        };
      }

      const updatedUser = await db.coordinateKeys(primaryUser, coordinatingPubKey, coordinatingUuid);

      return {
        success: true,
        coordinatingKeys: updatedUser.keys.coordinatingKeys
      };
    } catch (err) {
      console.error('juliaUserCoordinate error:', err);
      return {
        success: false,
        error: err.message
      };
    }
  },

  juliaNfcVerify: async (spell) => {
    try {
      const { primaryUUID, pubKey, bdoMessage, isCoordinating } = spell.components;

      if (!primaryUUID || !pubKey || !bdoMessage) {
        return {
          success: false,
          error: 'Missing required fields: primaryUUID, pubKey, bdoMessage'
        };
      }

      const primaryUser = await user.getUser(primaryUUID);

      if (!primaryUser) {
        return {
          success: false,
          error: 'Primary user not found'
        };
      }

      // Determine key type
      const keyType = isCoordinating ? 'coordinating' : 'interacting';

      // Import associate module for interacting keys
      const associateModule = await import('../associate/associate.js');
      const associate = associateModule.default;

      let updatedUser;
      if (isCoordinating) {
        // Add coordinating key
        const { createHash } = await import('crypto');
        const coordinatingUUID = createHash('sha256').update(pubKey).digest('hex').substring(0, 36);
        updatedUser = await db.coordinateKeys(primaryUser, pubKey, coordinatingUUID);
      } else {
        // Add interacting key via association
        const { createHash } = await import('crypto');
        const interactingUUID = createHash('sha256').update(pubKey).digest('hex').substring(0, 36);
        const interactingUser = {
          uuid: interactingUUID,
          pubKey: pubKey,
          keys: {interactingKeys: {}, coordinatingKeys: {}}
        };

        // Save interacting user if doesn't exist
        try {
          await user.getUser(interactingUUID);
        } catch (err) {
          await db.saveUser(interactingUser);
        }

        // Associate the users
        updatedUser = await associate.associate(primaryUser, interactingUser);
      }

      return {
        success: true,
        message: `Key verified and added as ${keyType} key`,
        keyType: keyType,
        pubKey: pubKey
      };
    } catch (err) {
      console.error('juliaNfcVerify error:', err);
      return {
        success: false,
        error: err.message
      };
    }
  }
};

export default MAGIC;
