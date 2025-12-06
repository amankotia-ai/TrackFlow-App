/**
 * Anonymous Name Generator
 * 
 * Generates fun, memorable anonymous names for visitors like PostHog does.
 * Names are deterministic based on visitor ID so the same visitor always
 * gets the same name.
 * 
 * Example names: "Useful Mule", "Clever Fox", "Swift Eagle"
 */

(function() {
  'use strict';

  // Adjectives - positive, memorable, and fun
  const ADJECTIVES = [
    'Useful', 'Clever', 'Swift', 'Happy', 'Bright',
    'Brave', 'Calm', 'Daring', 'Eager', 'Fancy',
    'Gentle', 'Handy', 'Jolly', 'Kind', 'Lucky',
    'Merry', 'Noble', 'Peppy', 'Quick', 'Rapid',
    'Savvy', 'Steady', 'Tender', 'Vivid', 'Witty',
    'Zesty', 'Agile', 'Bold', 'Cosmic', 'Dreamy',
    'Epic', 'Fluffy', 'Groovy', 'Humble', 'Icy',
    'Jazzy', 'Keen', 'Lively', 'Mighty', 'Nimble',
    'Optimal', 'Plucky', 'Quirky', 'Radiant', 'Snappy',
    'Thrifty', 'Ultra', 'Vibrant', 'Wandering', 'Youthful',
    'Zealous', 'Artful', 'Breezy', 'Chirpy', 'Dapper',
    'Elegant', 'Fiery', 'Gleeful', 'Hasty', 'Inventive',
    'Jaunty', 'Knowing', 'Luminous', 'Magical', 'Nifty',
    'Oceanic', 'Peaceful', 'Quiet', 'Rowdy', 'Silky',
    'Timely', 'Unique', 'Valiant', 'Wondrous', 'Exotic'
  ];

  // Animals - fun and recognizable
  const ANIMALS = [
    'Mule', 'Fox', 'Eagle', 'Dolphin', 'Owl',
    'Wolf', 'Bear', 'Tiger', 'Lion', 'Falcon',
    'Hawk', 'Raven', 'Otter', 'Beaver', 'Badger',
    'Panda', 'Koala', 'Sloth', 'Gecko', 'Iguana',
    'Toucan', 'Parrot', 'Penguin', 'Seal', 'Walrus',
    'Moose', 'Elk', 'Deer', 'Rabbit', 'Hare',
    'Squirrel', 'Chipmunk', 'Raccoon', 'Possum', 'Skunk',
    'Hedgehog', 'Porcupine', 'Armadillo', 'Anteater', 'Tapir',
    'Jaguar', 'Leopard', 'Cheetah', 'Lynx', 'Panther',
    'Mongoose', 'Meerkat', 'Wombat', 'Platypus', 'Kangaroo',
    'Wallaby', 'Lemur', 'Gibbon', 'Gorilla', 'Chimp',
    'Orangutan', 'Mandrill', 'Capybara', 'Chinchilla', 'Ferret',
    'Stoat', 'Weasel', 'Mink', 'Marten', 'Wolverine',
    'Coyote', 'Jackal', 'Hyena', 'Dingo', 'Fennec',
    'Narwhal', 'Beluga', 'Orca', 'Manatee', 'Dugong'
  ];

  // Robot/Bot emoji for the avatar
  const AVATAR_EMOJIS = [
    '🤖', '👾', '🎭', '🦊', '🐻', '🐼', '🐨', '🦁', 
    '🐯', '🐺', '🦅', '🦉', '🐬', '🐙', '🦋', '🌟',
    '🎪', '🎨', '🎯', '🎲', '🧩', '🔮', '💎', '🌈'
  ];

  /**
   * Simple hash function for strings
   * Converts a string to a consistent numeric value
   * @param {string} str - String to hash
   * @returns {number} Hash value
   */
  function hashString(str) {
    let hash = 0;
    if (!str || str.length === 0) return hash;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash);
  }

  /**
   * Generate a deterministic anonymous name from a visitor ID
   * The same visitor ID will always produce the same name
   * @param {string} visitorId - The visitor's unique ID
   * @returns {string} Anonymous name like "Useful Mule"
   */
  function generateName(visitorId) {
    if (!visitorId) {
      // Fallback to random if no ID provided
      const adjIndex = Math.floor(Math.random() * ADJECTIVES.length);
      const animalIndex = Math.floor(Math.random() * ANIMALS.length);
      return `${ADJECTIVES[adjIndex]} ${ANIMALS[animalIndex]}`;
    }

    const hash = hashString(visitorId);
    const adjIndex = hash % ADJECTIVES.length;
    const animalIndex = Math.floor(hash / ADJECTIVES.length) % ANIMALS.length;

    return `${ADJECTIVES[adjIndex]} ${ANIMALS[animalIndex]}`;
  }

  /**
   * Generate a deterministic avatar emoji from a visitor ID
   * @param {string} visitorId - The visitor's unique ID
   * @returns {string} Avatar emoji
   */
  function generateAvatar(visitorId) {
    if (!visitorId) {
      return AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];
    }

    const hash = hashString(visitorId + '_avatar');
    return AVATAR_EMOJIS[hash % AVATAR_EMOJIS.length];
  }

  /**
   * Generate a deterministic color for the visitor's avatar background
   * Returns HSL color string for nice pastel colors
   * @param {string} visitorId - The visitor's unique ID
   * @returns {string} HSL color string
   */
  function generateColor(visitorId) {
    if (!visitorId) {
      const hue = Math.floor(Math.random() * 360);
      return `hsl(${hue}, 70%, 80%)`;
    }

    const hash = hashString(visitorId + '_color');
    const hue = hash % 360;
    // Pastel colors with good saturation
    return `hsl(${hue}, 70%, 80%)`;
  }

  /**
   * Generate a complete visitor profile with name, avatar, and color
   * @param {string} visitorId - The visitor's unique ID
   * @returns {Object} { name, avatar, color }
   */
  function generateProfile(visitorId) {
    return {
      name: generateName(visitorId),
      avatar: generateAvatar(visitorId),
      color: generateColor(visitorId),
      initials: generateInitials(visitorId)
    };
  }

  /**
   * Generate initials from the anonymous name
   * @param {string} visitorId - The visitor's unique ID
   * @returns {string} Two-letter initials like "UM" for "Useful Mule"
   */
  function generateInitials(visitorId) {
    const name = generateName(visitorId);
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  /**
   * Get or create a stored name for a visitor
   * Uses VisitorIdentity if available to persist the name
   * @param {string} visitorId - The visitor's unique ID
   * @returns {string} The visitor's anonymous name
   */
  function getOrCreateName(visitorId) {
    // Try to get stored name first
    if (typeof window !== 'undefined' && window.VisitorIdentity) {
      const storedName = window.VisitorIdentity.getStoredName();
      if (storedName) {
        return storedName;
      }
      
      // Generate and store new name
      const newName = generateName(visitorId);
      window.VisitorIdentity.setStoredName(newName);
      return newName;
    }
    
    // Fallback to just generating
    return generateName(visitorId);
  }

  // Export the module
  const AnonymousNameGenerator = {
    generateName,
    generateAvatar,
    generateColor,
    generateProfile,
    generateInitials,
    getOrCreateName,
    ADJECTIVES,
    ANIMALS,
    AVATAR_EMOJIS
  };

  // Export for ES modules
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnonymousNameGenerator;
  }

  // Export for browser global
  if (typeof window !== 'undefined') {
    window.AnonymousNameGenerator = AnonymousNameGenerator;
  }

  // Export for AMD
  if (typeof define === 'function' && define.amd) {
    define([], function() { return AnonymousNameGenerator; });
  }

})();

