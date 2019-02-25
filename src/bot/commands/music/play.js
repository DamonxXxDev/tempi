const { Argument, Command } = require('discord-akairo');
const url = require('url');
const path = require('path');

class PlayCommand extends Command {
	constructor() {
		super('play', {
			aliases: ['play', 'p', 'add', '📥', '➕'],
			description: {
				content: 'Play a song from literally any source you can think of.',
				usage: '<link/search>',
				examples: ['justin bieber']
			},
			category: 'music',
			channel: 'guild',
			ratelimit: 2,
			args: [
				{
					id: 'unshift',
					match: 'flag',
					flag: ['--start', '-s']
				},
				{
					'id': 'query',
					'match': 'rest',
					'type': Argument.compose('string', string => string ? string.replace(/<(.+)>/g, '$1') : ''), // eslint-disable-line no-confusing-arrow
					'default': ''
				}
			]
		});
	}

	// eslint-disable-next-line valid-jsdoc
	/**
 *
 * @param {import('discord.js').Message} message -  essag
 */
	async exec(message, { query, unshift }) {
		if (!message.member.voice || !message.member.voice.channel) {
			return message.util.reply('You have to be in a voice channel first, silly.');
		} else if (!message.member.voice.channel.joinable) {
			return message.util.reply("I don't seem to have permission to enter this voice channel.");
		} else if (!message.member.voice.channel.speakable) {
			return message.util.send("I don't seem to have permission to talk in this voice channel.");
		}
		if (!query && message.attachments.first()) {
			query = message.attachments.first().url;
			if (!['.mp3', '.ogg', '.flac', '.m4a'].includes(path.parse(url.parse(query).path).ext)) return;
		} else if (!query) {
			return;
		}
		if (!['http:', 'https:'].includes(url.parse(query).protocol)) query = `ytsearch:${query}`;
		const res = await this.client.music.load(query);
		const queue = this.client.music.queues.get(message.guild.id);
		if (!message.guild.me.voice.channel) await queue.player.join(message.member.voice.channel.id);
		let msg;
		if (['TRACK_LOADED', 'SEARCH_RESULT'].includes(res.loadType)) {
			if (unshift) await queue.unshift(res.tracks[0].track);
			else await queue.add(res.tracks[0].track);
			msg = res.tracks[0].info.title;
		} else if (res.loadType === 'PLAYLIST_LOADED') {
			await queue.add(...res.tracks.map(track => track.track));
			msg = res.playlistInfo.name;
		} else {
			return message.util.send(`Are you sure \`\`${query}\`\` is a thing to play? I couldn't find it!`);
		}
		if (!queue.player.playing && !queue.player.paused) await queue.start();

		return message.util.send(`**Queued up:** \`${msg}\``);
	}
}

module.exports = PlayCommand;
