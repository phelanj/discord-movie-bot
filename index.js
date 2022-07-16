const { Client, MessageActionRow, MessageButton, MessageEmbed } = require('discord.js')
const { log } = require('console-log-colors');
const axios = require('axios')
const process = require('node:process')
require('dotenv').config()


const client = new Client({
    intents: ['GUILDS', 'GUILD_MESSAGES']
})

const COMMANDNAME = "ping"
const tmdb_img_url = "https://image.tmdb.org/t/p/w300/"
    // const tmdb_json_url = "https://api.themoviedb.org/3/movie/"
const TMDB_SEARCH_URL = "https://api.themoviedb.org/3/search/movie?"
const TMDB_ID_URL = "https://api.themoviedb.org/3/movie/"
const TMDB_KEY = process.env.TMDB_KEY
const JACK_ID = process.eventNames.JACK_ID
client.on('ready', () => {
    log.green('Movie Bot is Online')

    const guildID = process.env.VIP_GUILD
    const guild = client.guilds.cache.get(guildID)
    let commands

    if (guild) {
        commands = guild.commands
    } else {
        commands = client.application.commands
    }
    commands.create({
        name: COMMANDNAME,
        description: 'Googles movie for you',
        options: [{
                name: 'title',
                description: 'Movie Title',
                required: true,
                type: 3 //String
            },
            {
                name: 'year',
                description: 'Movie Release Date',
                required: false,
                type: 10 //Number
            }
        ]
    })
})



client.on('interactionCreate', async(interaction) => {
    if (!interaction.isCommand()) {
        return
    }
    const { commandName, options } = interaction
    if (commandName === COMMANDNAME) {
        const title = options.getString('title')
        const year = options.getNumber('year')
        console.log(`Title Entry: ${title}\nYear Entry: ${year}`)
        let data
        data = await gatherData(title, year)
        client.users.cache.get(JACK_ID).then((user) => {
            console.log(user)
            user.send(`Bot broke with error:`);
        });

        if (data) {
            const embed = new MessageEmbed()
                .setTitle(`${data["title"]} (${data["release_date"]})`)
                .setDescription(`Directed by: ${data["director"]}\nRuntime: ${data["runtime"]} minutes`)
            if (data["poster_url"]) {
                embed.setImage(data["poster_url"])
            }
            await interaction.reply({
                embeds: [embed]
            })
            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                    .setCustomId('delete_button')
                    .setLabel('Delete')
                    .setStyle('DANGER')
                )
            await interaction.followUp({
                content: "Not the right movie?",
                ephemeral: true,
                components: [row],
            })
        } else {
            interaction.reply({
                content: `nah man, that didn't work...\n${title}? what the fuck is that?`,
                ephemeral: true,
            })
        }

    }
})

client.on('interactionCreate', async(interaction) => {

    if (!interaction.isButton()) return

    if (interaction.customId == "delete_button") {
        const channel = interaction.channel
        let reply_id = interaction.message.reference.messageId
        try {
            const fetchedMsg = await channel.messages.fetch(reply_id)
            await fetchedMsg.delete()
        } catch (error) {
            log.yellow(`Tried to delete message but got error: ${error}`)
        }
        interaction.update({
            content: "<:dbcooper:744412438384083114>",
            components: [],
        })
    }

})

let gatherData = async(title, year) => {
    let movie_id, movie_json, director, data
    if (title) {
        movie_id = await get_movie_id(title, year)
        if (movie_id) {
            movie_json = await get_movie_json(movie_id)
            director = await get_director(movie_id)
            return build_post(movie_json, director)
        } else {
            return null
        }
    }
}

let get_movie_id = async(title, year) => {
    /*
    Use provided arguments to determine selected movie and return id string, otherwise return None
    */
    let params = { "api_key": TMDB_KEY, "query": title }
    if (year) {
        params["year"] = year
    }
    let url = TMDB_SEARCH_URL + encodeGetParams(params)
    console.log(url)

    let data = await fetch_call(url)
    if (data["results"].length === 0) {
        log.yellow("Zero search results")
        return null
    } else {
        return data["results"][0]["id"]
    }
}

let get_movie_json = async(movie_id) => {
    let url = `${TMDB_ID_URL}${movie_id}?api_key=${TMDB_KEY}`
    let data = await fetch_call(url)
    return data
}

let get_director = async(movie_id) => {
    let url = `${TMDB_ID_URL}/${movie_id}/credits?api_key=${TMDB_KEY}`
    let data = await fetch_call(url)
    let directors = []
    for (let person of data["crew"]) {
        if (Object.values(person).includes("Director")) {
            directors.push(person["name"])
        }
    }
    return directors.join(", ")
}


let fetch_call = async(url) => {
    let response = await axios.get(url)
    return response.data
}

let build_post = (movie_json, director) => {
    let data_dict = {}
    if (movie_json) {
        data_dict["title"] = movie_json["title"]
        date = new Date(movie_json["release_date"])
        data_dict["release_date"] = date.getFullYear()
        data_dict["runtime"] = movie_json["runtime"]
        data_dict["poster_url"] = tmdb_img_url + movie_json["poster_path"]
        if (director) {
            data_dict["director"] = director
        }
    }
    return data_dict
}

process.on('uncaughtException', (err) => {
    log.redBright('Process exit with error: ', err);
    // client.users.fetch(JACK_ID, false).then((user) => {
    //     user.send(`Bot broke with error: ${err}`);
    // });
});

const encodeGetParams = p =>
    Object.entries(p).map(kv => kv.map(encodeURIComponent).join("=")).join("&")

client.login(process.env.TOKEN)