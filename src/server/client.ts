import { RemoteProvider } from "../client/RemoteProvider";
import { OffsetMessage } from "../packet_definitions";
import { IClient } from "../server_definitions";
import { MAX_OFFSET_ARRAY_LENGHT } from "../shared_consts";
import { milliseconds, Timestamp, Node } from "../shared_definitions";

export class Client implements IClient {
	constructor(element: Node, provider: RemoteProvider) {
		this.element = element;
        this._provider = provider;
	}
	element: Node;

	skew: milliseconds = 0;
	offset: number = 0;
	_skewConfidence: milliseconds = 0;

    _provider: RemoteProvider
	_offsets: number[] = [];
	
	pong(t0: Timestamp, t1: Timestamp): void {
		const roundtrip = performance.now() - t0;
		const latency = roundtrip / 2;
		const offset = t0 + latency - t1;
		this._offsets.push(offset);
		this._calcOffset();
		this._sendOffset();
		//TODO
		this._calcSkew();
		this._calcSkewConfidence();
	}
	private _calcOffset(): void {
		this.offset =
			this._offsets.reduce((p, c) => p + c, 0) / this._offsets.length;
		if (this._offsets.length > MAX_OFFSET_ARRAY_LENGHT) {
			this._offsets.shift();
		}
	}
	private _sendOffset(): void {
		const message: OffsetMessage = {
			offset: this.offset,
			target: this.element.id,
		};
		this._provider.discover.send("offset", message);
	}
	private _calcSkew(): void {
		if (this._offsets.length <= 1) return;
		let total = 0;
		let last = this._offsets[0];
		for (let index = 1; index < this._offsets.length; index++) {
			let current = this._offsets[index];
			total += current - last;
			last = current;
		}
		this.skew = total / (this.offset - 1);

		this._calcSkewConfidence();
	}
	private _calcSkewConfidence(): void {
		this._skewConfidence = Math.sqrt(
			this._offsets
				.map((x) => Math.pow(x - this.offset, 2))
				.reduce((a, b) => a + b) / this._offsets.length
		);
	}
}
