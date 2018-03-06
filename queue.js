class MemoryQueue {
	constructor(){
		this.items = [];
	}

	enqueue( messages ){
		this.items = this.items.concat( messages )
	}

	dequeue( count ){
		return this.memoryBuffer.splice(0, count);
	}

	hasNone() { return this.items.length == 0 }
}

/**
 * A FIFO queue which will persist messages living past a certain age to a persistent storage mechanism.
 */
class SpoolingQueue {
	constructor( storage, storageTimeout, timer ){
		this.memoryBuffer = [];
		this.timer = timer;
		this.storage = storage;
		this.storageTimeout = storageTimeout;
	}

	enqueue( messages ){
		const storage = [].concat(messages).map( (message) => {
			const timerToken = this.timer.notifyIn(this.storageTimeout, async () => {
				this.memoryBuffer = this.memoryBuffer.filter( envelope => envelope.timerCancel != timerToken )

				await this.storage.store( message );
			});
			return {timerCancel: timerToken, message: message}
		});
		this.memoryBuffer = this.memoryBuffer.concat(storage)
	}

	async dequeue( count ){
		if( await this.storage.hasElements() ){
			return await this.storage.retrieve( count )
		} else {
			const removed = this.memoryBuffer.splice(0, count);
			return removed.map( (envelope) => envelope.message);
		}
	}

	hasNone() { return this.memoryBuffer.length === 0; }
}

module.exports.SpoolingQueue = SpoolingQueue;
