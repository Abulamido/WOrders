// src/types/telegram.ts
export interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
}

export interface TelegramChat {
    id: number;
    type: 'private' | 'group' | 'supergroup' | 'channel';
    first_name?: string;
    username?: string;
}

export interface TelegramMessage {
    message_id: number;
    from?: TelegramUser;
    chat: TelegramChat;
    text?: string;
    date: number;
}

export interface TelegramCallbackQuery {
    id: string;
    from: TelegramUser;
    message?: TelegramMessage;
    data: string;
}

export interface TelegramUpdate {
    update_id: number;
    message?: TelegramMessage;
    callback_query?: TelegramCallbackQuery;
}

export interface InlineKeyboardButton {
    text: string;
    callback_data?: string;
    url?: string;
}

export interface CoverageRequestData {
    coverage_id: string;
    shift_id: string;
    shift_date: string;
    shift_time: string;
    location: string;
    requester_name: string;
}
