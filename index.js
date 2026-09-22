require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  Events
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Emojis numerados
const numeros = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

// Registrar o comando /reagir
const commands = [
  new SlashCommandBuilder()
    .setName('reagir')
    .setDescription('Adiciona reações numeradas em uma imagem')
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once(Events.ClientReady, async () => {
  console.log(`Bot online como ${client.user.tag}`);

  try {
    console.log('Registrando comandos...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('Comandos registrados com sucesso!');
  } catch (error) {
    console.error(error);
  }
});

// Quando alguém usa /reagir
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'reagir') {
    // Verifica se a pessoa respondeu uma mensagem
    const mensagemReferenciada = interaction.options.getMessage?.('mensagem') 
      || (interaction.message?.reference ? await interaction.channel.messages.fetch(interaction.message.reference.messageId) : null);

    // Se não respondeu nenhuma mensagem, pega a última mensagem com imagem do canal
    let mensagemAlvo = null;

    if (interaction.reference) {
      mensagemAlvo = await interaction.channel.messages.fetch(interaction.reference.messageId);
    } else {
      // Pega as últimas 10 mensagens e procura uma com imagem
      const mensagens = await interaction.channel.messages.fetch({ limit: 10 });
      mensagemAlvo = mensagens.find(m => m.attachments.size > 0 || m.embeds.length > 0);
    }

    if (!mensagemAlvo) {
      return interaction.reply({
        content: '❌ Não encontrei nenhuma imagem recente. Responda a mensagem da imagem com o comando `/reagir`.',
        ephemeral: true
      });
    }

    // Cria o menu de seleção
    const select = new StringSelectMenuBuilder()
      .setCustomId(`selecionar_quantidade_${mensagemAlvo.id}`)
      .setPlaceholder('Quantos personagens tem na imagem?')
      .addOptions(
        Array.from({ length: 10 }, (_, i) => {
          const num = i + 1;
          return new StringSelectMenuOptionBuilder()
            .setLabel(`${num} personagem${num > 1 ? 'ns' : ''}`)
            .setDescription(`Adicionar ${num} reação${num > 1 ? 'ões' : ''} numerada${num > 1 ? 's' : ''}`)
            .setValue(String(num))
            .setEmoji(numeros[i]);
        })
      );

    const row = new ActionRowBuilder().addComponents(select);

    await interaction.reply({
      content: 'Escolha quantos personagens tem na imagem:',
      components: [row],
      ephemeral: true
    });
  }
});

// Quando a pessoa escolhe no menu
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isStringSelectMenu()) return;

  if (interaction.customId.startsWith('selecionar_quantidade_')) {
    const mensagemId = interaction.customId.split('_')[2];
    const quantidade = parseInt(interaction.values[0]);

    try {
      const mensagem = await interaction.channel.messages.fetch(mensagemId);

      // Adiciona as reações numeradas
      for (let i = 0; i < quantidade; i++) {
        await mensagem.react(numeros[i]);
      }

      await interaction.update({
        content: `✅ Adicionei **${quantidade}** reação${quantidade > 1 ? 'ões' : ''} numerada${quantidade > 1 ? 's' : ''}!`,
        components: []
      });

    } catch (error) {
      console.error(error);
      await interaction.update({
        content: '❌ Não consegui adicionar as reações. Verifique se eu tenho permissão de **Add Reactions**.',
        components: []
      });
    }
  }
});

client.login(process.env.TOKEN);