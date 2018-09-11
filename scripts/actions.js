Creature.prototype.eat = function (p) {
	let pos = p || this.getPosition();
	let tile = map[pos[0]][pos[1]];

	this.energy -= energy.eat;

	this.maxSpeed = Math.max(maxCreatureSpeed - eatSlowDown, 0);

	if (tile.food - this.output[2] <= 0) {
		tile.food = 0;
		this.energy += (tile.food * eatEffeciency) * (tile.food / maxTileFood);
	} else if (tile.food > 0) {
		tile.food -= this.output[2];
		this.energy += (this.output[2] * eatEffeciency) * (tile.food / maxTileFood);
	}
};

Creature.prototype.metabolize = function () {
	this.energy -= energy.metabolism * (this.age / (1000 / ageSpeed));
};

Creature.prototype.move = function () {
	this.energy -= energy.move * (this.size / maxCreatureSize) * (Math.abs(this.output[0]) + Math.abs(this.output[1]));

	this.x += this.output[0] * this.maxSpeed;
	this.y += this.output[1] * this.maxSpeed;
};

Creature.prototype.reproduce = function (t) {
	if (this.age > reproduceAge && this.reproduceTime > minReproduceTime) {
		for (let i = 0; i < this.children; i++) {
			if (this.energy < energy.birth * this.childEnergy) break;
			let child = new Creature(this.x, this.y, this.size, this.color, this.species, this.speciesGeneration, this.generation + 1);
			child.copyNeuralNetwork(this);
			child.energy = creatureEnergy * this.childEnergy * birthEffeciency;
			child.children = this.children / 2;

			child.mutate();

			creatures.push(child);

			this.energy -= energy.birth * (this.childEnergy * creatureEnergy);
			this.reproduceTime = 0;
		}
	}

	population = creatures.length;
};

Creature.prototype.die = function () {
	if (population <= minCreatures) {
		//console.log(this.species + " died.");
		
		try {
			specieslist[this.species].contains.splice(specieslist[this.species].contains.indexOf(this), 1);
		} catch (e) {
			console.error(this.species);
		}

		//console.log("  " + specieslist[this.species].contains.length + " left");
		
		if (specieslist[this.species].contains.length === 0) {
		  //console.log("removed species " + this.species);
			delete specieslist[this.species];
		}
		
		this.randomize();
	} else {
	  //console.log(this.species + " died.");
	  
		let pos = creatures.indexOf(this);

		creatures.splice(pos, 1);
		
		try {
			specieslist[this.species].contains.splice(specieslist[this.species].contains.indexOf(this), 1);
		} catch (e) {
			console.error(this.species);
		}

		//console.log("  " + specieslist[this.species].contains.length + " left");
		
		if (specieslist[this.species].contains.length === 0) {
		  //console.log("removed species " + this.species);
			delete specieslist[this.species];
		}
	}

	population = creatures.length;
};

Creature.prototype.attack = function () {
	let att = this.output[4];

	for (let creature of creatures) {
		if (creature === this) continue;

		if (Math.round(this.x / tileSize) == Math.round(creature.x / tileSize)) {
			if (Math.round(this.y / tileSize) == Math.round(creature.y / tileSize)) {
				creature.energy -= att * attackPower;
				this.energy -= energy.attack * (this.size / maxCreatureSize);

				this.energy += att * attackPower * attackEffeciency;
			}
		}
	}
};