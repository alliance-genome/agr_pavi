export interface NightingaleChangeEvent extends Event {
    detail: {
        'display-start': number
        'display-end': number
    }
}
