const { Argument, Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const { stripIndents } = require('common-tags');
const paginate = require('../../../../util/paginate');
const timeString = require('../../../../util/timeString');

class PlaylistShowCommand extends Command {
	constructor() {
		super('playlist-show', {
			category: 'music',
			description: {
				content: 'Displays songs from a playlist.',
				usage: '<playlist> [page]'
			},
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			ratelimit: 2,
			args: [
				{
					id: 'playlist',
					match: 'content',
					type: 'playlist',
					prompt: {
						start: message => `${message.author}, What playlist do you want information on?`,
						retry: (message, { failure }) => `${message.author}, a playlist with the name **${failure.value}** does not exist.`
					}
				},
				{
					'id': 'page',
					'match': 'content',
					'type': Argument.compose((_, str) => str.replace(/\s/g, ''), Argument.range(Argument.union('number', 'emojint'), 1, Infinity)),
					'default': 1
				}
			]
		});
	}

	async exec(message, { playlist, page }) {
		if (!playlist.songs.length) return message.util.send('This playlist has no songs!');
		const decoded = await this.client.music.decode(playlist.songs);
		const totalLength = decoded.reduce((prev, song) => prev + song.info.length, 0);
		const paginated = paginate(decoded, page);
		let index = 10 * (paginated.page - 1);

		const embed = new MessageEmbed()
			.setAuthor(`${message.author.tag} (${message.author.id})`, message.author.displayAvatarURL())
			.setDescription(stripIndents`
				__**Song list:**__

				${paginated.items.map(song => `**${++index}.** [${song.info.title}](${song.info.uri}) (${timeString(song.info.length)})`).join('\n')}

				**Total queue items:** ${decoded.length} | **Total queue time:** ${timeString(totalLength)}
			`);
		if (paginated.maxPage > 1) embed.setFooter(`Page ${page}/${paginated.maxPage}`, 'https://i.imgur.com/nFPDKdU.png');

		return message.util.send(embed);
	}
}

module.exports = PlaylistShowCommand;
