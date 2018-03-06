const mocha = require("mocha")
const assert = require("assert")
const {LogicalTimer} = require('../timers')
const {SpoolingQueue} = require('../queue')
const Future = require('../future');

class FakeStorage {
	constructor( timer, delay = 1 ){
		this.timer = timer;
		this.delay = delay;
		this.pendingBatches = [];
		this.batches = [];
	}

	async store( batch ){
		this.pendingBatches.push(batch);
		return this.timer.promiseIn( this.delay, () => {
			this.pendingBatches.pop(batch);
			return true;
		});
	}

	async hasElements() {
		if( this.pendingBatches.length < 0 ){ return false; }
		return this.timer.promiseIn( this.delay, () => {
			return this.batches.length > 0;
		});
	}
}

function it_has_elements(){
	it( "has elements", function(){
		assert(!this.queue.hasNone())
	})
}

function it_has_no_elements(){
	it( "has no elements", function(){
		assert(this.queue.hasNone())
	})
}

describe( "SpoolingQueue", function () {
	beforeEach( function(){
		this.timer = new LogicalTimer();
		this.storageDelay = 1;
		this.storage = new FakeStorage( this.timer, this.storageDelay );
		this.queue = new SpoolingQueue( this.storage, 1, this.timer );
	});

	describe("when empty", function() {
		it("returns an empty array to dequeue", function () {
			const result = this.queue.dequeue(100);
			assert.deepEqual([], result);
		})

		it_has_no_elements();
	})

	describe("with a single element enqueue", function() {
		beforeEach( function () {
			const token = "Tolken";
			this.token = token;
			this.queue.enqueue( token );
			this.timer.advance(this.storageDelay * 2);
		});

		it_has_elements()

		describe("when dequeued immeidately", function() {
			beforeEach( function() {
				this.result = this.queue.dequeue(100);
			})

			it("returns the enqueued element", async function () {
				assert.deepEqual([await this.token], this.result);
			})

			it_has_no_elements();
		})

		describe("when loss apptite window closes", function(){
			beforeEach( function() {
				this.timer.advance(this.storageTimeout);
			});

			it("requests the element is presisted", function(){
				assert.equal(this.storage.pendingBatches.length, 1);
			});

			it_has_elements()

			describe("when items are dequeed", function(){
				beforeEach( function() {
					this.resultPromise = this.queue.dequeue(100);
					this.timer.advance(this.storageDelay * 2);
				})
				beforeEach( async function(){
					this.result = await this.resultPromise
				})

				it("provides the stored item", async function(){
					assert.deepEqual([ this.token ], this.result)
				});

				it_has_no_elements();
			})

			describe("when another item is enqueue", function(){
				it("does not immeidately persist the new item")
			})
		})
	})
})
