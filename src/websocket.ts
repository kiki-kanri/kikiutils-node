import logger from 'node-color-log';
import { sleep } from 'sleep-ts';
import WebSocket, { ClientOptions } from 'ws';

import { AesCrypt } from './aes';
import { randomStr } from './string';
import { Dict } from './typing';

type eventCallback = (args?: any[], kwargs?: Dict<any>) => void | Promise<void>;

export class WebsocketClient {
	aes: AesCrypt;
	checkInterval: number;
	code: string;
	connectionOptions: ClientOptions;
	disconnecting: boolean;
	eventHandlers: Dict<eventCallback>;
	name: string;
	url: string;
	waitingEvents: Dict<Dict<Promise<any>>>;
	ws?: WebSocket;

	constructor(
		aes: AesCrypt,
		name: string,
		url: string,
		checkInterval = 3000,
		extraData: Dict<any> = {},
		connectionOptions: ClientOptions = {}
	) {
		this.aes = aes;
		this.checkInterval = checkInterval;
		this.code = randomStr();
		this.connectionOptions = {
			headers: {
				'extra-info': this.aes.encrypt(extraData)
			},
			...connectionOptions
		};

		this.disconnecting = false;
		this.eventHandlers = {}
		this.name = name;
		this.url = url;
		this.waitingEvents = {};
	}

	protected async checkConnection() {
		try {
			this.ws?.ping();
			if (this.ws?.readyState !== 1) throw new Error();
			setTimeout(() => this.checkConnection(), this.checkInterval);
		} catch(_) {
			logger.error('Websocket connection error.');
			this.connect(true);
		}
	}

	async connect(waitForSuccess = false) {
		if (this.disconnecting) return;
		this.ws = new WebSocket(this.url, this.connectionOptions);

		this.ws.onclose = () => {
			this.disconnecting = false;
		}

		this.ws.onerror = async () => {
			logger.error('Websocket connect error.');
			this.connect();
		}

		this.ws.onmessage = ({ data }) => {
			const decryptedData = this.aes.decrypt(data as string);
			const eventName = decryptedData[0];
			if (this.eventHandlers[eventName]) this.eventHandlers[eventName](decryptedData[1], decryptedData[2]);
		}

		this.ws.onopen = () => {
			logger.success('Websocket success connected.');
			this.emit('init', [], { code: this.code });
			this.checkConnection();
		}

		while (waitForSuccess && this.ws.readyState !== 1) await sleep(50);
	}

	disconnect() {
		this.disconnecting = true;
		this.ws?.close();
	}

	emit(event: string, args: any[] = [], kwargs: Dict<any> = {}) {
		this.ws?.send(this.aes.encrypt([event, args, kwargs]));
	}

	registerEvent(eventName: string, callback: eventCallback) {
		this.eventHandlers[eventName] = callback;
	}
}
