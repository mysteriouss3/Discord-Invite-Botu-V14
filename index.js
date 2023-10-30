const { Client, GatewayIntentBits, Partials, Events, ActivityType, EmbedBuilder, Embed } = require("discord.js")
const { InviteData } = require("./DataBase/invite")
const System = require("./Config")


const client = global.client = new Client({
    fetchAllMembers: true,
    intents: Object.keys(GatewayIntentBits),
    partials: Object.keys(Partials),
})

client.invites = new Map();




client.on(Events.ClientReady, () => {

    const getType = (type) => {
        switch (type) {
            case 'COMPETING':
                return ActivityType.Competing;

            case 'LISTENING':
                return ActivityType.Listening;

            case 'PLAYING':
                return ActivityType.Playing;

            case 'WATCHING':
                return ActivityType.Watching;

            case 'STREAMING':
                return ActivityType.Streaming;
            default:
                return ActivityType.Custom;
        }
    };
    setInterval(async () => {
        const liste = System.Aktivites;
        const listes = ['PLAYING', 'WATCHING', 'LISTENING', 'STREAMING', 'COMPETING'];
        const stats = ['dnd', 'idle', 'online', 'idle', 'dnd', 'dnd', 'dnd', 'online', 'idle'];
        const statsrndm = Math.floor(Math.random() * stats.length);
        const random = Math.floor(Math.random() * liste.length);
        const rndm = Math.floor(Math.random() * listes.length);

        const statusOptions = {
            status: stats[statsrndm],
            activities: [
                {
                    name: liste[random],
                    type: getType(listes[rndm]),
                },
            ],
        };
        client.user.setPresence(statusOptions)
    }, 60000);

    client.guilds.cache.forEach(guild => {
        guild.invites.fetch()
            .then(invites => {
                const codeUses = new Map();
                invites.each(inv => codeUses.set(inv.code, inv.uses));
                client.invites.set(guild.id, codeUses);
            })
    })

    console.log("[MYS] Invite Bot Aktif!")
})


const DB = require('./DataBase/MongoDriver');


(async () => {
  await DB.Connect();
})();

client.login(System.Token).then(() => console.log(`🟢 [MYS] Invite Bot ${client.user.username} Aktif !`))
    .catch((err) => console.log("Discord: mysterious3 kullanıcısına mesaj atarak hatayı bildir!\n" + `🔴 Bot Giriş Yapamadı / Sebep: ${err}`))


client.on(Events.InviteDelete, async (invite) => {
    const invites = await invite.guild.invites.fetch();
    if (!invites) return;

    invites.delete(invite.code);
    client.invites.delete(invite.guild.id, invites);
})

client.on(Events.InviteCreate, async (invite) => {

    const invites = await invite.guild.invites.fetch();
    if (!invites) return;

    const codeUses = new Map();
    invites.each(inv => codeUses.set(inv.code, inv.uses));
    client.invites.set(invite.guild.id, codeUses);
})

client.on(Events.GuildMemberAdd, async (member) => {
    try {
        const cachedInvites = client.invites.get(member.guild.id)
        const newInvites = await member.guild.invites.fetch();
        const usedInvite = newInvites.find(inv => cachedInvites.get(inv.code) < inv.uses);
        newInvites.each(inv => cachedInvites.set(inv.code, inv.uses));
        client.invites.set(member.guild.id, cachedInvites);

        if (!usedInvite) return;

        if (member.guild.premiumTier == 3 && usedInvite.code == member.guild.vanityURLCode) {
            const totalDavet = await InviteData.updateOne({ guildID: member.guild.id, userID: member.id }, { $inc: { GuildInvites: 1 } }, { upsert: true, new: true });
            Send(member.guild, `**${member} Adlı Kullanıcı <t:${Math.floor(Date.now() / 1000)}:R> Sunucuya Katıldı!**\n> **\`Davet Eden;\` Özel URL ( Toplam Daveti ${totalDavet.GuildInvites ?? 1} )**\n> Sunucumuz **${member.guild.memberCount}** üye sayısına ulaştı!`);
        }

        else if (usedInvite.inviter.id == member.user.id) {
            Send(member.guild, `**${member} Adlı Kullanıcı <t:${Math.floor(Date.now() / 1000)}:R> Sunucuya Katıldı!**\n> **\`Davet Eden;\` Kendi Daveti**\n> Sunucumuz **${member.guild.memberCount}** üye sayısına ulaştı!`);
        }

        else if ((Date.now() - member.user.createdTimestamp) >= 7 * 24 * 60 * 60 * 1000) {
            await InviteData.updateOne({ guildID: member.guild.id, userID: usedInvite.inviter.id }, { $inc: { Regular: 1 } }, { upsert: true });
            await InviteData.updateOne({ guildID: member.guild.id, userID: member.user.id }, { $set: { inviter: usedInvite.inviter.id } }, { upsert: true });
            let data = await InviteData.findOne({ guildID: member.guild.id, userID: usedInvite.inviter.id });
            let toplam = data ? data.Regular : 0;
            Send(member.guild, `**${member} Adlı Kullanıcı <t:${Math.floor(Date.now() / 1000)}:R> Sunucuya Katıldı!**\n> **\`Davet Eden;\` <@${usedInvite.inviter.id}> ${toplam > 0 ? `( Toplam Daveti ${parseInt(toplam)} )` : " "}**\n> Sunucumuz **${member.guild.memberCount}** üye sayısına ulaştı!`);
        }
        else {
            await InviteData.updateOne({ guildID: member.guild.id, userID: usedInvite.inviter.id }, { $inc: { Fake: 1 } }, { upsert: true });
            await InviteData.updateOne({ guildID: member.guild.id, userID: member.id }, { $set: { inviter: usedInvite.inviter.id } }, { upsert: true });
            let data = await InviteData.findOne({ guildID: member.guild.id, userID: usedInvite.inviter.id });
            let toplam = data ? data.Regular : 0;
            Send(member.guild, `**${member} Adlı Kullanıcı <t:${Math.floor(Date.now() / 1000)}:R> Sunucuya Katıldı!**\n> **\`Davet Eden;\` <@${usedInvite.inviter.id}> ${toplam > 0 ? `( Toplam Daveti ${parseInt(toplam)} )` : " "}**\n> Sunucumuz **${member.guild.memberCount}** üye sayısına ulaştı!`, 1);
        }

    }
    catch (err) {
        console.log("Discord: mysterious3 kullanıcısına mesaj atarak hatayı bildir!\n" + err);
    }
})

client.on(Events.GuildMemberRemove, async (member) => {
    let createTime = (Date.now() - member.user.createdTimestamp) >= 7 * 24 * 60 * 60 * 1000;

    let url = member.guild.premiumTier == 3 ? await member.guild.fetchVanityData().then(x => x.uses) : 1;

    let data = await InviteData.findOne({ guildID: member.guild.id, userID: member.id });

    if (!data || !data.inviter || data.inviter == null || data.inviter == undefined) {
        Send(member.guild, `**${member} Adlı Kullanıcı <t:${Math.floor(Date.now() / 1000)}:R> Sunucudan Ayrıldı!**\n> **\`Davet Eden;\` Bulunamadı**\n> Sunucumuz **${member.guild.memberCount}** üye sayısına düştü!`);
    } else if (data.inviter == member.guild.id) {
        Send(member.guild, `**${member} Adlı Kullanıcı <t:${Math.floor(Date.now() / 1000)}:R> Sunucudan Ayrıldı!**\n> **\`Davet Eden;\` Özel URL ( Toplam Daveti ${url} )**\n> Sunucumuz **${member.guild.memberCount}** üye sayısına düştü!`);
    } else {
        if (data.inviter == member.user.id) {
            return Send(member.guild, `**${member} Adlı Kullanıcı <t:${Math.floor(Date.now() / 1000)}:R> Sunucudan Ayrıldı!**\n> **\`Davet Eden;\` Kendi Daveti**\n> Sunucumuz **${member.guild.memberCount}** üye sayısına düştü!`);
        }
        if (createTime) {
            await InviteData.updateOne({ guildID: member.guild.id, userID: data.inviter }, { $inc: { Regular: -1, Left: 1 } }, { upsert: true });
            let datainvite = await InviteData.findOne({ guildID: member.guild.id, userID: data.inviter });
            let toplam = datainvite ? datainvite.Regular : 0;
            Send(member.guild,`**${member} Adlı Kullanıcı <t:${Math.floor(Date.now() / 1000)}:R> Sunucudan Ayrıldı!**\n> **\`Davet Eden;\` <@${data.inviter}> ${toplam > 0 ? `( Toplam Daveti ${parseInt(toplam)} )` : " "}**\n> Sunucumuz **${member.guild.memberCount}** üye sayısına düştü!`);
        } else {
            await InviteData.updateOne({ guildId: member.guild.id, userID: data.inviter }, { $inc: { Fake: -1, Left: 1 } }, { upsert: true });
            let datainvite = await InviteData.findOne({ guildId: member.guild.id, userID: data.inviter });
            let toplam = datainvite ? datainvite.Regular : 0;
            Send(member.guild, `**${member} Adlı Kullanıcı <t:${Math.floor(Date.now() / 1000)}:R> Sunucudan Ayrıldı!**\n> **\`Davet Eden;\` <@${data.inviter}> ${toplam > 0 ? `( Toplam Daveti ${parseInt(toplam)} )` : " "}**\n> Sunucumuz **${member.guild.memberCount}** üye sayısına düştü!`, 1);
        }
    }
})

function Send(guild, message) {
    try {

        let log = guild.channels.cache.find(x => x.id == System.InviteLogChannelID); // <--- Kanal ID
        if (!log) return console.error("Sunucuda invite-log Adında Kanal Bulunmadığı İçin Davet Mesajı Gönderemedim!");
        let embed = new EmbedBuilder()
            .setColor("#00ff00")
            .setDescription(`> ${message}`)
            .setFooter({text:`mysterious3 Invite Bot`})
        log.send({ embeds: [embed] })
    }
    catch (err) {
        console.log("Discord: mysterious3 kullanıcısına mesaj atarak hatayı bildir!\n" + err);
    }
}

process.on('unhandledRejection', (error) => {
    console.error('Discord: mysterious3 kullanıcısına mesaj atarak hatayı bildir!\nUnhandled Promise Rejection:', error);
});
