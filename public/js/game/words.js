// Word pools used to generate typing tests.

export const WORDS = {
  easy: [
    "apple", "ball", "cat", "dog", "egg", "fish", "go", "hat", "ice", "jump", "key", "lamp",
    "man", "nose", "open", "pen", "queen", "run", "sun", "top", "up", "van", "win", "yes",
    "zoo", "bag", "cup", "door", "ear", "fan", "girl", "hill", "ink", "jet", "kid", "leg",
    "map", "net", "orange", "pig", "quiz", "rat", "sock", "toy", "umbrella", "vest", "web",
    "xray", "yard", "zero", "blue", "red", "green", "big", "small", "happy", "sad", "hot",
    "cold", "fast", "slow", "love", "like", "hate", "walk", "ride", "read", "write", "play",
    "sleep", "eat", "drink", "cook", "clean", "draw", "sing", "dance", "smile", "laugh", "cry",
    "table", "chair", "bed", "shirt", "pants", "shoes", "coat", "car", "bus", "train", "milk",
    "juice", "bread", "cheese", "banana", "grape", "peach", "pear", "kite", "cloud",
  ],
  medium: [
    "animal", "artist", "beach", "bottle", "bridge", "candle", "castle", "circle", "clothes",
    "cloudy", "cookie", "corner", "desert", "doctor", "dollar", "dragon", "drawer", "engine",
    "enjoy", "family", "farmer", "finger", "forest", "frozen", "garage", "garden", "giant",
    "guitar", "hammer", "honest", "island", "jungle", "ladder", "lizard", "market", "mirror",
    "monster", "mountain", "music", "nature", "nearly", "needle", "nobody", "nurse", "object",
    "office", "pencil", "pepper", "pillow", "planet", "pocket", "police", "pretty", "puzzle",
    "rabbit", "rescue", "river", "rocket", "rough", "runner", "safety", "scared", "shadow",
    "silver", "simple", "singer", "slower", "snowy", "spider", "spring", "stairs", "storm",
    "summer", "supper", "teacher", "ticket", "tunnel", "uncle", "vacuum", "village", "violin",
    "waiter", "wallet", "washer", "whistle", "window", "winter", "wonder", "worker", "zebra",
    "angry", "brave", "careful", "clever", "early", "excited", "friendly", "gentle", "hungry",
    "lucky",
  ],
  hard: [
    "abandon", "absolute", "abstract", "acquire", "agony", "allegory", "altitude", "ambition",
    "analyze", "anguish", "apathy", "archive", "ascend", "aspire", "awkward", "bizarre",
    "blurred", "bountiful", "burden", "cascade", "chaotic", "clarity", "collapse", "commence",
    "complex", "conquer", "crimson", "cryptic", "deceit", "decipher", "delicate", "despair",
    "dignity", "dormant", "dreadful", "elaborate", "elevate", "eloquent", "elusive", "emerge",
    "enigma", "essence", "eternal", "evolve", "exquisite", "fable", "famine", "fascinate",
    "feeble", "flicker", "flourish", "frigid", "frustrate", "gesture", "glimpse", "gratitude",
    "hazard", "heritage", "hypothesis", "illuminate", "immense", "impulse", "incline",
    "inevitable", "inquire", "intellect", "intrigue", "jubilant", "lament", "liberate",
    "luminous", "magnitude", "marvel", "melancholy", "mimic", "mystery", "narrate", "obscure",
    "ominous", "paradox", "perplex", "persist", "portray", "precious", "prejudice", "profound",
    "realm", "refuge", "reluctant", "remedy", "resilient", "reverence", "sacrifice", "scarcity",
    "serenity", "significance", "solitary", "spectacle", "subtle", "turmoil",
  ],
};

export const CODE = {
  easy: [
    "let", "var", "const", "if", "else", "true", "false", "null", "undefined", "return",
    "function", "for", "while", "i++", "i--", "i+=1", "i-=1", "x+y", "x-y", "x*y", "x/y",
    "x==y", "x!=y", "x>y", "x<y", "&&", "||", "!x", "console.log()", "alert()", "parseInt()",
    "push()", "pop()", "shift()", "unshift()", "length", "toString()", "join()", "split()",
  ],
  medium: [
    "array", "object", "string", "number", "boolean", "map()", "filter()", "reduce()",
    "forEach()", "find()", "some()", "every()", "includes()", "indexOf()", "i*=2", "i/=2",
    "++i", "--i", "x%y", "x===y", "x!==y", "x>=y", "x<=y", "x&&y||z", "!x&&y", "x??y", "x?y:z",
    "substring()", "slice()", "splice()", "concat()", "charAt()", "trim()", "toLowerCase()",
    "toUpperCase()", "Math.floor()", "Math.ceil()", "Math.round()", "Math.random()",
    "Object.keys()", "Object.values()", "Array.isArray()", "then()", "catch()", "finally()",
    "setTimeout()", "setInterval()", "querySelector()", "getElementById()",
  ],
  hard: [
    "async", "await", "yield", "x**=y", "x|=y", "x&=y", "x^=y", "x<<=y", "x>>=y", "x>>>=y",
    "x&y", "x|y", "x^y", "~x", "x<<y", "x>>y", "x>>>y", "x**y", "Promise.all()",
    "Promise.race()", "Promise.resolve()", "Promise.reject()", "bind()", "call()", "apply()",
    "Object.freeze()", "Object.seal()", "Object.create()", "Object.defineProperty()",
    "Object.assign()", "Symbol.iterator", "Symbol.species", "Array.from()", "Array.of()",
    "requestAnimationFrame()", "Object.prototype", "Function.prototype", "Array.prototype",
    "String.prototype", "Reflect.get()", "Reflect.set()", "Reflect.has()", "Reflect.apply()",
  ],
};

export const SYMBOLS = "!@#$%^&*()-_+={}[]|\\:;\"'<>,.?/";

export const DIGITS = "0123456789";
