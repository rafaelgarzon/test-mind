export type SupportedLanguage = 'es' | 'en';

export class LanguageDetector {
    private static readonly spanishPatterns =
        /\b(el|la|los|las|de|en|que|un|una|al|del|se|es|con|por|para|ingresa|realiza|valida|busca|abre|hace|clic|usuario|pagina|sitio|consulta|resultado|primer|primero)\b/gi;

    static detect(text: string): SupportedLanguage {
        const matches = text.match(this.spanishPatterns) ?? [];
        return matches.length >= 3 ? 'es' : 'en';
    }
}
