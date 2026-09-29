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
            usedIds: new Set(),
            poolCursor: 1,
            maxPage: 20,
            roundsSinceRefresh: 0
        }
    },
    mounted() {
        this.initializeAnimePool().then(() => this.getTwoAnime())
        this.highScore = Number(localStorage.getItem('highScore')) || 0
    },
    methods: {
        async initializeAnimePool() {
            const query = `
                query ($page: Int) {
                    Page(page: $page, perPage: 50) {
                        media(
                            type: ANIME
                            sort: POPULARITY_DESC
                            isAdult: false
                            status: FINISHED
                            popularity_greater: 100000
                        ) {
                            id
                            title { english romaji }
                            episodes
                            averageScore
                            popularity
                            siteUrl
                            coverImage { large }
                        }
                    }
                }
            `
            try {
                const pagesToFetch = this.sampleUniquePages(25,5)
                const results = await Promise.all(pagesToFetch.map(page =>
                    fetch('https://graphql.anilist.co', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({ query, variables: { page } })
                    })
                    .then(res => res.json())
                    .then(json => {
                        if (json.errors) {
                            console.error(`Anilist error on page ${page}:`, json.errors)
                            return []
                        }
                        return json.data.Page.media
                    })
                ))

                const seen = new Set()
                this.animePool = results.flat().filter(a => {
                    if (seen.has(a.id)) return false
                    seen.add(a.id)
                    return true
                })
                console.log(`Loaded ${this.animePool.length} anime into pool from pages: ${pagesToFetch.join(', ')}`)
            } catch(err) {
                console.error("Failed to load anime pool:", err)
                this.animePool = []
            }
        },
        sampleUniquePages(count, max) {
            const pages = new Set()
            while (pages.size < Math.min(count, max)) {
                pages.add(1 + Math.floor(Math.random() * max))
            }
            return [...pages]
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

            const minPopDiff = 50000
            let attempts = 0;
            const maxAttempts = 5
            
            // Avoid close match-ups
            while (Math.abs(first.popularity - second.popularity < minPopDiff)) {
                second = this.pickRandomFromPool()
                // Avoid duplicates
                while (first.id === second.id) second = this.pickRandomFromPool
                attempts++
                if (attempts >= maxAttempts) break
            }
            
            this.animePair = [first, second]
            this.loading = false
        }
    }
}).mount('#app')