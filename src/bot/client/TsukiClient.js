const { join } = require('path');
const { AkairoClient, CommandHandler, InhibitorHandler, ListenerHandler } = require('discord-akairo');
const { Util } = require('discord.js');
const { Client: Lavaqueue } = require('lavaqueue');
const { createLogger, transports, format } = require('winston');
const database = require('../structures/Database');
const { default: Storage, ReferenceType } = require('rejects');
const SettingsProvider = require('../structures/SettingsProvider');
const Raven = require('raven');

class TsukiClient extends AkairoClient {
	constructor(config) {
		super({ ownerID: config.owner }, {
			disableEveryone: true,
			disableEvents: ['TYPING_START']
		});

		this.logger = createLogger({
			format: format.combine(
				format.colorize({ all: true }),
				format.timestamp({ format: 'YYYY/MM/DD HH:mm:ss' }),
				format.printf(info => `[${info.timestamp}] ${info.level}: ${info.message}`)
			),
			transports: [new transports.Console()]
		});

		this.db = database;

		this.settings = new SettingsProvider(database.model('settings'));

		this.music = new Lavaqueue({
			userID: process.env.ID ? process.env.ID : this.user.id,
			password: process.env.LAVALINK_PASSWORD ? process.env.LAVALINK_PASSWORD : 'abooody888',
			hosts: {
				rest: process.env.LAVALINK_REST ? process.env.LAVALINK_REST : 'http://localhost:7000',
				ws: process.env.LAVALINK_WS ? process.env.LAVALINK_WS : 'ws://localhost:7000',
				/* eslint-disable multiline-ternary */
				redis: process.env.REDIS ? {
					port: 6379,
					host: process.env.REDIS,
					db: 0
				} : ''
				/* eslint-enable multiline-ternary */
			},
			send: (guild, packet) => {
				const shardGuild = this.guilds.get(guild);
				if (shardGuild) return shardGuild.shard.send(packet);
				return Promise.resolve();
			}
		});
		this.redis = this.music.queues.redis;

		this.storage = new Storage(this.redis);

		this.on('raw', async packet => {
			switch (packet.t) {
				case 'VOICE_STATE_UPDATE':
					if (packet.d.user_id !== process.env.ID) return;
					this.music.voiceStateUpdate(packet.d);
					const players = await this.storage.get('players', { type: ReferenceType.ARRAY }); // eslint-disable-line no-case-declarations
					let index; // eslint-disable-line no-case-declarations
					if (Array.isArray(players)) index = players.findIndex(player => player.guild_id === packet.d.guild_id);
					if (((!players && !index) || index < 0) && packet.d.channel_id) {
						// eslint-disable-next-line camelcase
						await this.storage.upsert('players', [{ guild_id: packet.d.guild_id, channel_id: packet.d.channel_id }]);
					} else if (players && typeof index !== 'undefined' && index >= 0 && !packet.d.channel_id) {
						players.splice(index, 1);
						await this.storage.delete('players');
						if (players.length) await this.storage.set('players', players);
					}
					break;
				case 'VOICE_SERVER_UPDATE':
					this.music.voiceServerUpdate(packet.d);
					break;
				default:
					break;
			}
		});

		this.commandHandler = new CommandHandler(this, {
			directory: join(__dirname, '..', 'commands'),
			prefix: ['🎶', '🎵', '🎼', '🎹', '🎺', '🎻', '🎷', '🎸', '🎤', '🎧', '🥁'],
			aliasReplacement: /-/g,
			allowMention: true,
			commandUtil: true,
			commandUtilLifetime: 5000,
			defaultCooldown: 3000,
			defaultPrompt: {
				modifyStart: str => `${str}\n\nType \`cancel\` to cancel the command.`,
				modifyRetry: str => `${str}\n\nType \`cancel\` to cancel the command.`,
				timeout: 'Guess you took too long, the command has been cancelled.',
				ended: "More than 3 tries and you still didn't quite get it. The command has been cancelled",
				cancel: 'The command has been cancelled.',
				retries: 3,
				time: 30000
			}
		});
		this.commandHandler.resolver.addType('playlist', async (phrase, message) => {
			if (!phrase) return null;
			phrase = Util.cleanContent(phrase.toLowerCase(), message);
			const playlist = await this.db.models.playlists.findOne({
				where: {
					name: phrase,
					guild: message.guild.id
				}
			});

			return playlist || null;
		});
		this.commandHandler.resolver.addType('existingPlaylist', async (phrase, message) => {
			if (!phrase) return null;
			phrase = Util.cleanContent(phrase.toLowerCase(), message);
			const playlist = await this.db.models.playlists.findOne({
				where: {
					name: phrase,
					guild: message.guild.id
				}
			});

			return playlist ? null : phrase;
		});

		this.inhibitorHandler = new InhibitorHandler(this, { directory: join(__dirname, '..', 'inhibitors') });
		this.listenerHandler = new ListenerHandler(this, { directory: join(__dirname, '..', 'listeners') });

		this.config = config;

		if (process.env.RAVEN) {
			Raven.config(process.env.RAVEN, {
				captureUnhandledRejections: true,
				autoBreadcrumbs: true,
				environment: process.env.NODE_ENV,
				release: '0.1.0'
			}).install();
		} else {
			process.on('unhandledRejection', this.logger.warn);
		}

		this.init();
	}

	init() {
		this.commandHandler.useInhibitorHandler(this.inhibitorHandler);
		this.commandHandler.useListenerHandler(this.listenerHandler);
		this.listenerHandler.setEmitters({
			commandHandler: this.commandHandler,
			inhibitorHandler: this.inhibitorHandler,
			listenerHandler: this.listenerHandler
		});

		this.commandHandler.loadAll();
		this.inhibitorHandler.loadAll();
		this.listenerHandler.loadAll();
	}

	async start() {
		await this.settings.init();
		return this.login(this.config.token);
	}
}

module.exports = TsukiClient;