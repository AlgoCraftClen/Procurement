const conversations = new Map();

function createWelcomeConversation(metadata = {}) {
  return {
    id: crypto.randomUUID(),
    metadata,
    status: "idle",
    messages: []
  };
}

export const agentSDK = {
  async createConversation({ metadata } = {}) {
    const conversation = createWelcomeConversation(metadata);
    conversations.set(conversation.id, conversation);
    return conversation;
  },

  async getConversation(id) {
    return conversations.get(id) || createWelcomeConversation({ name: "Lijakwe Chat" });
  },

  subscribeToConversation(id, callback) {
    const conversation = conversations.get(id);
    if (conversation) callback?.(conversation);
    return () => {};
  },

  async addMessage(conversation, message) {
    const stored = conversations.get(conversation.id) || conversation;
    stored.messages = [
      ...(stored.messages || []),
      { ...message, created_date: new Date().toISOString() },
      {
        role: "assistant",
        content: "AI chat is paused while this project is moved to Supabase. Core procurement data screens remain available.",
        created_date: new Date().toISOString()
      }
    ];
    stored.status = "idle";
    conversations.set(stored.id, stored);
    return stored;
  }
};
