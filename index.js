// ✅ index.js - Discord Bot 驗證簡化版（驗證成功與輸入訊息自動刪除）
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
});

const roleMap = {
  Rook: "Rook",
  Knight: "Knight",
  Bishop: "Bishop",
};

const validServers = Object.keys(roleMap);
const verifyChannelName = "身分驗證-verification";
const logChannelName = "驗證紀錄-verification-log";

const formatGuide = `📌 請使用以下格式進行身分驗證：
<server> <遊戲ID>
【範例 Examples】
\`\`\`
Knight 小艾
Bishop 星羽
Rook 索拉卡

Knight Soraka
Bishop Ayaka
Rook Leon
\`\`\`
請在此頻道輸入正確格式，即可自動驗證。\nPlease enter the correct format above to get verified.`;

client.once('ready', () => {
  console.log(`✅ Bot 上線中：${client.user.tag}`);
});

client.on('guildMemberAdd', async (member) => {
  const channel = member.guild.channels.cache.find(c => c.name === verifyChannelName && c.isTextBased());
  if (!channel) return;

  try {
    const messages = await channel.messages.fetch({ limit: 50 });
    for (const msg of messages.values()) {
      if (!msg.pinned) await msg.delete().catch(() => {});
    }
    await channel.send(formatGuide);
  } catch (err) {
    console.error("❌ 無法清理驗證頻道：", err.message);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.name !== verifyChannelName) return;

  const [rawServer, ...nameParts] = message.content.trim().split(" ");
  const server = rawServer.charAt(0).toUpperCase() + rawServer.slice(1).toLowerCase();
  const gameID = nameParts.join(" ").trim();
  const logChannel = message.guild.channels.cache.find(c => c.name === logChannelName);

  if (!validServers.includes(server) || !gameID) {
    await message.delete().catch(err => console.error("❌ 無法刪除使用者訊息：", err.message));
    return;
  }

  const nickname = `${server} - ${gameID}`;
  const roleToAdd = message.guild.roles.cache.find(r => r.name === server);
  const unverifiedRole = message.guild.roles.cache.find(r => r.name === "未驗證");

  try {
    await message.member.setNickname(nickname);
    if (roleToAdd) await message.member.roles.add(roleToAdd);
    if (unverifiedRole) await message.member.roles.remove(unverifiedRole);

    const reply = await message.reply(`✅ 驗證成功 / Verified!
你已被更名為 **${nickname}**，並獲得 **${server}** 身分組。`);
    setTimeout(() => reply.delete().catch(() => {}), 3000);

    if (logChannel) {
      logChannel.send(`✅ 驗證成功：**${nickname}** (<@${message.author.id}>) 已獲得 ${server}`);
    }
  } catch (err) {
    console.error("❌ 錯誤：", err.message);
    const failReply = await message.reply("⚠️ 驗證失敗，請通知管理員。\nVerification failed. Please contact admin.");
    setTimeout(() => failReply.delete().catch(() => {}), 3000);

    if (logChannel) {
      logChannel.send(`⚠️ 驗證失敗：<@${message.author.id}> 嘗試輸入：\`${message.content}\`，錯誤：${err.message}`);
    }
  }

  await message.delete().catch(err => console.error("❌ 無法刪除使用者訊息：", err.message));

    // 🔁 再次貼上格式教學訊息
  try {
    const messages = await message.channel.messages.fetch({ limit: 50 });
    for (const msg of messages.values()) {
      if (!msg.pinned) await msg.delete().catch(() => {});
    }
    const guide = await message.channel.send(formatGuide);
    guide.pin().catch(() => {});
  } catch (err) {
    console.error("❌ 無法清理訊息貼上教學：", err.message);
  }
});

client.login(process.env.DISCORD_TOKEN);
