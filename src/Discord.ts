import {
	Client,
	GatewayIntentBits,
	Message,
	Partials,
	PublicThreadChannel,
	TextBasedChannel,
	Typing,
	User
} from "discord.js";
import {botId, derekId, discordToken} from "./Token";
import {derek, derekEmoji, intro} from "./Main";

const pjson = require('../package.json')

const client = new Client(
	{
		intents: [GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageTyping, GatewayIntentBits.DirectMessages, GatewayIntentBits.DirectMessageReactions],
		partials: [Partials.Message, Partials.Channel, Partials.Reaction]
	});

const nogoChannels = ['1176992991043407963', '1182555938356473886', '1176998907667038278', '1174207032979632188',
	'1176992452377329784', '1175326592080281621', '1177126823717519430', '1174199339258740768', '1204589588350246972',
	'1184984066349617172', '1176996010782888066'];

const yesChannels = ['1217270398799056906', '1216029240538042368'];

const nogoWords = ['nigger', 'nigga', 'fag', 'faggot', 'retard', 'chink', 'beaner', 'cracker', 'nig', 'nigg', 'nigge'];


async function main(): Promise<void> {
	console.log(`Version = ${pjson.version}`);

	// removes all tags. the cleanContent param doesn't work because it will change derekbot's id to its name, which is
	// variable and hard to check and replace.
	function getCleanContent(content: string) {
		return content.replace(/<@[0-9]*>/g, '').trim();
	}

	function getGuildMember(user: User) { // get server "member" of user. server here is the cmu discord
		return client.guilds.cache.get('1174113338343559269').members.fetch(user);
	}

	// allows custom channel in case of threads, because messages can be both in a channel and a thread and defaults to
	// channel.
	async function derekReply(message: Message, channel?: TextBasedChannel, ctxMessages?: Message[]) {
		const cleanContent = getCleanContent(message.content);
		if (cleanContent.length === 0) return;
		await (channel ?? message.channel).sendTyping();

		// get name (i.e., first word) in cmu server of this user. the stuff after ?? is needed in case it's a dm.
		async function getName(message: Message) {
			return (message.member ?? await getGuildMember(message.author)).displayName.split(' ')[0];
		}

		const ctx: [string, string][] = []; // convert Message to input and name
		if (ctxMessages) {
			for (const ctxm of ctxMessages) {
				const cc = getCleanContent(ctxm.content);
				if (cc.length === 0) continue;
				ctx.push([cc, await getName(ctxm)]);
			}
		}

		const reply = await derek(cleanContent, await getName(message), ctx);
		console.log(`Input: ${cleanContent}, Output: ${reply}`);

		for (const nogo of nogoWords) { // slur filter
			if (reply.includes(nogo)) {
				return;
			}
		}

		let msg;
		if (Math.random() < 0.3 && !channel) { // send reply with odds if channel is not manual - lazy fix
			msg = await message.reply({
				content: reply,
				allowedMentions: {repliedUser: false}
			});
		} else {
			if (channel) msg = channel.send(reply); // manual channel (i.e. thread)
			else msg = await message.channel.send(reply);
		}

		console.log('renaming myself'); // rename myself to whatever derek's name is
		const derekMember = message.guild?.members.cache.get(derekId);
		const me = msg.member;
		if (derekMember && me && derekMember.displayName !== me.displayName) {
			await msg.member.setNickname(derekMember.displayName);
		}
	}

	async function sendIntro(message: Message) {
		let name = message.member.displayName.split(' ')[0];
		console.log('sending intro to ' + name);
		try {
			// check that dm has not already been created
			const dms = await (await message.author.createDM()).messages.fetch({limit: 1});
			// console.log(dms.values().next())
			// await dms.values().next().value.delete();

			console.log('dms size: ' + dms.size);
			if (dms.size === 0) {
				await message.member.send(await intro(name));
			}
		} catch (e) {
			console.error("intro error: ", e);
		}
	}

	client.once('ready', async () => {
		console.log('Ready!');
	});

	client.on('messageCreate', async (message) => {
		try {
			if (message.author.bot) return;
			if (nogoChannels.includes(message.channel.id)) return;
			// to prevent clash with threadCreate
			if (message.channel.isThread() && (await message.channel.messages.fetch({limit: 3})).size <= 2) return;

			if (Math.random() < 0.01) { // can react in non nogo but not yes channels.
				console.log("reacting with emoji");
				try {
					let emoji;
					if (message.author.id === derekId && Math.random() < 0.5) {
						emoji = '🤖';
					} else {
						emoji = Math.random() < 0.5 ? '💀' : await derekEmoji(getCleanContent(message.content));
					}
					if (emoji) await message.react(emoji);
				} catch (e) {
					console.error("emoji error: ", e);
				}
			}

			if (!yesChannels.includes(message.channel.id) && !message.channel.isThread() && !message.channel.isDMBased()) return;
			if (message.channel.isDMBased()) { // if dm
				console.log("dm message");
				await derekReply(message);
				return;
			}

			if (Math.random() < 0.005) { // low chance of sending intro
				await sendIntro(message);
			}

			if (message.mentions.users.has(botId)) {
				if (message.author.id === "796906555076771900" && Math.random() < 0.05) {
					await message.channel.send("good one cringe god"); // lol
				} else {
					if (message.reference?.messageId) { // reply to message exists
						const ref = await message.channel.messages.fetch(message.reference.messageId);
						if (ref.author.id !== botId) { // ignore if it's a reply to derekbot himself
							await derekReply(message, undefined, [ref]);
							return;
						} else {
							await derekReply(message);
						}
					} else {
						await derekReply(message);
					}
				}
			}
		} catch (e) {
			console.error(e);
		}
	});

	client.on('threadCreate', async (thread: PublicThreadChannel) => {
		console.log("thread created: " + thread.name);
		// first message of thread and empty message
		const starter = await thread.fetchStarterMessage();
		if (starter.author.bot) return;
		let lastMessage: Message<true>;
		while (!lastMessage?.content) { // sometimes last message comes after thread creation. fixes race condition
			lastMessage = (await thread.messages.fetch({limit: 1})).first();
		}
		console.log('last', lastMessage.content)
		if (lastMessage.content === `<@${botId}>`) { // empty ping
			await derekReply(starter, thread);
		} else if (lastMessage.mentions.users.has(botId)) { // ping with additional instructions
			await derekReply(lastMessage, thread, [starter]); // orig starter message passed as ctx
		}
	});

	client.on('typingStart', async (typing: Typing) => {
		try {
			if (typing.user.bot) return;
			if (!yesChannels.includes(typing.channel.id) && !typing.channel.isThread() && !typing.channel.isDMBased()) return;

			if (typing.user.id !== derekId) { // only derek typing activates it
				return;
			}

			// get last message of channel, ignore if it's derek or a bot
			const messages = await typing.channel.messages.fetch({limit: 1});
			const lastMessage = messages.first();
			console.log('lastMessage id: ' + lastMessage.author.id);
			if (lastMessage.author.id === derekId || lastMessage.author.bot) return;

			await derekReply(lastMessage);

			if (Math.random() < 0.005) {
				await sendIntro(lastMessage);
			}
		} catch (e) {
			console.error(e);
		}
	});

	await client.login(discordToken);
}

main().then();
