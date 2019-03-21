const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const { stripIndents } = require('common-tags');

class HelpCommand extends Command {
	constructor() {
		super('help', {
			aliases: ['help'],
			description: {
				content: 'Display list of commands or a command help',
				usage: '[command]'
			},
			category: 'util',
			clientPermissions: ['EMBED_LINKS'],
			ratelimit: 2,
			args: [
				{
					id: 'command',
					type: 'commandAlias'
				}
			]
		});
	}

	exec(message, { command }) {
		const prefix = this.handler.prefix(message)[0];
		if (!command) {
			const embed = new MessageEmbed()
				.setColor(3447003)
				.addField('❯ Commands', stripIndents`A list of available commands.
					For additional info on a command, type \`${prefix}help <command>\`
				`);

			for (const category of this.handler.categories.values()) {
				embed.addField(`❯ ${category.id.replace(/(\b\w)/gi, lc => lc.toUpperCase())}`, `${category.filter(cmd => cmd.aliases.length).map(cmd => `\`${cmd.aliases[0]}\``).join(' ')}`);
			}

			return message.util.send(embed);
		}

		const embed = new MessageEmbed()
			.setColor(3447003)
			.setAuthor(`${command.aliases[0].replace(/(\b\w)/gi, lc => lc.toUpperCase())} Help`, 'https://images-ext-2.discordapp.net/external/Na1A42IsnllvKah5w2E8qEoTX5VMgkiFd6Y18oy7-Ws/%3Fwidth%3D473%26height%3D473/https/images-ext-2.discordapp.net/external/ixx9VwaXIvBi71wGahYe_NzG51gFQonnXVBl2eEbQmk/https/cdn.pixabay.com/photo/2012/04/14/16/26/question-34499_960_720.png')
			.addField('❯ Description', command.description.content || '\u200b');

		if (command.aliases.length > 1) embed.addField('❯ Aliases', `\`${command.aliases.join('` `')}\``, true);
		if (command.description.examples && command.description.examples.length) embed.addField('❯ Examples', `\`${command.aliases[0]} ${command.description.examples.join(`\`\n\`${command.aliases[0]} `)}\``, true);
		if (command.description.usage) embed.addField('❯ Usage', `\`${prefix}${command.aliases[0]} ${command.description.usage}\``, true);

		return message.util.send(embed);
	}
}

module.exports = HelpCommand;
