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
				embed.addField(`❯ ${category.id.replace(/(\b\w)/gi, lc => lc.toUpperCase())}`, `${category.filter(cmd => cmd.aliases.length && cmd.id !== 'playlist').map(cmd => `\`${cmd.aliases[0]}\``).join(' ')}`);
			}

			return message.util.send(embed);
		}

		if (command.id === 'playlist') return;

		const embed = new MessageEmbed()
			.setColor(3447003)
			.setTitle(`\`${command.aliases[0]} ${command.description.usage ? command.description.usage : ''}\``)
			.addField('❯ Description', command.description.content || '\u200b');

		if (command.aliases.length > 1) embed.addField('❯ Aliases', `\`${command.aliases.join('` `')}\``, true);
		if (command.description.examples && command.description.examples.length) embed.addField('❯ Examples', `\`${command.aliases[0]} ${command.description.examples.join(`\`\n\`${command.aliases[0]} `)}\``, true);

		return message.util.send(embed);
	}
}

module.exports = HelpCommand;
