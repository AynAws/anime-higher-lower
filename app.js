window.app = Vue.createApp({
    data() {
        return {
            animePair: [],
            loading: true,
            highScore: 0,
            streak: 0,
            hint: false,
            guessed: false,
            animePool: [], // Pre-fetched list of mainstream anime
            lastRequestTime: 0,
        }
    },
    mounted() {
        this.initializeAnimePool().then(() => this.getTwoAnime())
        this.highScore = Number(localStorage.getItem('highScore')) || 0
    },
    methods: {
        async initializeAnimePool() {
            // Fetch popular, non-adult anime once (cached for 24h by AniList)
            const query = `
                query {
                    Page(page: 1, perPage: 50) {
                        media(
                            type: ANIME
                            sort: POPULARITY_DESC
                            isAdult: false
                            status: FINISHED
                            averageScore_greater: 60
                        ) {
                            id
                            malId
                            title { english romaji }
                            episodes
                            averageScore
                            popularity
                        }
                    }
                }
            `
            try {
                const res = await fetch('https://graphql.anilist.co', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query })
                })
                const { data } = await res.json()
                this.animePool = data.Page.media
                console.log(`Loaded ${this.animePool.length} anime into pool`)
            } catch(err) {
                console.error("Failed to load anime pool:", err)
                // Fallback: could retry or use a smaller set
            }
        },
        pickRandomFromPool() {
            return this.animePool[Math.floor(Math.random() * this.animePool.length)]
        },
        getHint(anime) {
            this.hint = true
        },
        async guessOverUnder(guess, other) {
            this.guessed = true
            if (guess.popularity >= other.popularity) this.streak++
            else this.streak = 0
            
            if (this.streak > Number(localStorage.getItem('highScore'))) {
                localStorage.setItem('highScore', this.streak)
                this.highScore = this.streak
            }
            await new Promise(res => setTimeout(res, 1200))
            await this.getTwoAnime()
            this.hint = false
            this.guessed = false
        },
        getTwoAnime() {
            this.loading = true
            let first = this.pickRandomFromPool()
            let second = this.pickRandomFromPool()
            
            // Avoid duplicate
            while (second.id === first.id) {
                second = this.pickRandomFromPool()
            }
            
            this.animePair = [first, second]
            this.loading = false
        }
    }
}).mount('#app')