require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, Routes, REST } = require('discord.js');
const fetch = require('node-fetch');
const { PublicKey } = require('@solana/web3.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const ROLE_ID = process.env.ROLE_ID;
const RECEIVING_ADDRESS = process.env.SOLANA_RECEIVING_ADDRESS;
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const VIP_PRICE = 1; // en SOL

// Enregistrement des commandes slash
const commands = [
  new SlashCommandBuilder().setName('vip').setDescription('Obtenir les infos de paiement pour devenir VIP.'),
  new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Vérifie le paiement et donne le rôle VIP.')
    .addStringOption(option => option.setName('wallet').setDescription('Adresse Solana').setRequired(true))
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('Commandes enregistrées');
  } catch (error) {
    console.error(error);
  }
})();

client.on('ready', () => {
  console.log(`Connecté en tant que ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'vip') {
    await interaction.reply(`💰 Envoie **1 SOL** à cette adresse : \`${RECEIVING_ADDRESS}\`\nPuis fais \`/verify <ton_wallet>\` pour obtenir le rôle.`);
  }

  if (interaction.commandName === 'verify') {
    const userWallet = interaction.options.getString('wallet');

    try {
      new PublicKey(userWallet); // validation du format wallet
    } catch {
      return await interaction.reply({ content: 'Adresse wallet invalide.', ephemeral: true });
    }

    const url = `https://api.helius.xyz/v0/addresses/${RECEIVING_ADDRESS}/transactions?api-key=${HELIUS_API_KEY}&limit=50`;
    const response = await fetch(url);
    const data = await response.json();

    // Recherche de la transaction valide
    const tx = data.find(tx =>
      tx.type === 'TRANSFER' &&
      tx.source === userWallet &&
      tx.destination === RECEIVING_ADDRESS &&
      parseFloat(tx.amount) >= VIP_PRICE
    );

    if (tx) {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      await member.roles.add(ROLE_ID);
      await interaction.reply('✅ Accès VIP accordé pour 30 jours !');

      // Suppression automatique du rôle après 30 jours
      setTimeout(async () => {
        const refreshedMember = await interaction.guild.members.fetch(interaction.user.id);
        await refreshedMember.roles.remove(ROLE_ID);
      }, 1000 * 60 * 60 * 24 * 30);
    } else {
      await interaction.reply({ content: '❌ Aucun paiement valide trouvé.', ephemeral: true });
    }
  }
});

client.login(TOKEN);


client.login(TOKEN);
