export default function createElement(tag: string) {
    return new ElementBuilder(tag);
}

export class ElementBuilder {
    readonly element;
    constructor(tagName: string) {
        this.element = document.createElement(tagName);
    }

    id(id: string) {
        this.element.id = id;
        return this;
    }

    innerText(text: string) {
        this.element.innerText = text;
        return this;
    }

    innerHtml(html: string) {
        this.element.innerHTML = html;
        return this;
    }

    classes(...classes: string[]) {
        this.element.className = classes.join(' ');
        return this;
    }

    eventListener(event: string, callback: EventListenerOrEventListenerObject) {
        this.element.addEventListener(event, callback);
        return this;
    }
}