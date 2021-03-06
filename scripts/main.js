function main() {
	let odate = new Date();
	if (creatures.length > 2000) return;
	if (timescale >= 1) { // Can timescale ever go below 1?
		for (let ts = 0; ts < timescale; ts++) {
			update();
		}
	} else {
		tc++;
		if (tc > 1 / timescale) {
			update();

			tc = 0;
		}
	}

	let ndate = new Date();

	if (ndate - odate < 50) twice = false;

	if (twice && !fastforward && autoMode) {
		timescale *= 0.95;
	} else {
	  render();
	}

	if (ndate - odate >= 50) twice = true;
}

function wallLock(creature) {
	if (creature.x <= 0) {
		creature.x = 0;
	} else if (creature.x >= mapSize * tileSize) {
		creature.x = mapSize * tileSize - 1;
	}

	if (creature.y <= 0) {
		creature.y = 0;
	} else if (creature.y >= mapSize * tileSize) {
		creature.y = mapSize * tileSize - 1;
	}
}

function clampSize(creature) {
	if (creature.energy > creatureEnergy * creature.size / maxCreatureSize) creature.energy = creatureEnergy * creature.size / maxCreatureSize;
	if (creature.energy <= 0) {
		if (creature == selectedCreature) selectedCreature = null;
		creature.die();
	}
}

function update() {
	tick++;
	if (seasonUp) {
		season++;
	} else season--;

	if (season >= growSeasonLength + dieSeasonLength || season < 0) {
		seasonUp = !seasonUp;
		if (seasonUp) year++;
	}

	if (season % mapUpdateDelay == 0) {
		for (let i in map) {
			for (let j in map[i]) {
				if (map[i][j].type == 1) {
					if (season < growSeasonLength) {
						map[i][j].food += seasonChange * mapUpdateDelay;
					} else {
						map[i][j].food -= seasonChange * mapUpdateDelay;
					}

					map[i][j].food += foodRegrowRate * mapUpdateDelay;

					if (map[i][j].food > map[i][j].maxFood) map[i][j].food = map[i][j].maxFood;
					else if (map[i][j].food < 0) map[i][j].food = 0;
				}
			}
		}
	}

	for (let creature of creatures) {
		if (creature.age > oldest) oldest = creature.age;

		wallLock(creature);
		clampSize(creature);

		let size = ((creature.size - minCreatureSize) / (maxCreatureSize - minCreatureSize));
		let energy = creature.energy / (creatureEnergy * creature.size / maxCreatureSize);
		let pos = creature.getPosition();
		let eyes = [];
		for (let eye of creature.eyes) {
			eyes.push(eye.see());
		}

		// UNUSED SENSES //
		/* let x = (creature.x / (tileSize * mapSize));
			let y = (creature.y / (tileSize * mapSize));
			let color = creature.color.replace(" ", "").replace("hsl", "").replace("(", "").replace(")", "").split(",");
			let lastContactX = 0;
			let lastContactY = 0;
			let lastContactPos = [0, 0];
			let lastContactSize = 1;
			let lastContactColor = [0, 0, 0];
			let lastContactEnergy = 0;

			for (let creature2 of creatures) {
				if (creature2 == creature) continue;
				if (~~(creature.x / tileSize) == ~~(creature2.x / tileSize)) {
					if (~~(creature.y / tileSize) == ~~(creature2.y / tileSize)) {
						creature.lastContact = creature2;
					}
				}
			}

			if (typeof creature.lastContact !== "undefined") {
				lastContactPos = creature.lastContact.getPosition();
				lastContactSize = ((creature.lastContact.size - minCreatureSize) / (maxCreatureSize - minCreatureSize));
				lastContactX = creature.lastContact.x / (tileSize * mapSize);
				lastContactY = creature.lastContact.y / (tileSize * mapSize);
				lastContactColor = creature.lastContact.color.replace(" ", "").replace("hsl", "").replace("(", "").replace(")", "").split(",");
				lastContactEnergy = creature.lastContact.energy / (creatureEnergy * creature.size / maxCreatureSize);
			}
		
			let memory = [];
			let age = (creature.age / (1000 / agingSpeed));
			let reproduceTime = creature.reproduceTime / (minReproduceTime * 2.5); */

		let tileFood = map[pos[0]][pos[1]].food / maxTileFood;

		let rotation = creature.rotation / (2 * Math.PI);

		creature.input = [Math.E / 5, rotation, size, energy, tileFood, season / (growSeasonLength + dieSeasonLength)];

		for (let eye of eyes) {
			if (eye[1] == "tile") {
				creature.input.push(eye[0].food / maxTileFood);
			} else if (eye[1] == "creature") {
				creature.input.push(eye[0].energy / creatureEnergy);
			} else if (eye[1] == "oob") {
				creature.input.push(eye[0]);
			}
		}

		creature.output = creature.feedForward(creature.input);

		if (creature.output[2] >= minEatPower) {
			creature.eat(pos);
		} else creature.maxSpeed = maxCreatureSpeed;

		if (map[pos[0]][pos[1]].type === 0) creature.maxSpeed = maxCreatureSpeed * swimmingSpeed;

		if (creature.output[3] >= minReproducePower) creature.reproduce();
		if (creature.output[4] >= minAttackPower) creature.attack();

		creature.move();
		creature.metabolize();

		creature.tick();

		if (creature == selectedCreature && zoomLevel > 0.424) {
			cropx -= (cropx - (creature.x * zoomLevel - canvas.width / 2)) / (50 / zoomLevel);
			cropy -= (cropy - (creature.y * zoomLevel - canvas.height / 2)) / (50 / zoomLevel);
		}
	}
}

function render() {
	ctx.clearRect(0, 0, display.width, display.height);
	ctz.clearRect(0, 0, viewport.width, viewport.height);

	for (let i in map) {
		for (let j in map[i]) {
			if (map[i][j].type === 0) continue;
			let hue = Math.max(100 - (season - growSeasonLength) / (growSeasonLength + dieSeasonLength) * 2 * 50, 50) + "," + Math.floor(map[i][j].food / maxTileFood * 100);

			ctx.fillStyle = "hsl(" + hue + "%, 22%)";
			ctx.fillRect(i * tileSize * zoomLevel - cropx - 1, j * tileSize * zoomLevel - cropy - 1, tileSize * zoomLevel + 2, tileSize * zoomLevel + 2);
		}
	}

	ctx.strokeStyle = "#ffffff";
	ctx.lineWidth = 10 * zoomLevel;
	for (let i in outline) {
		ctx.beginPath();
		ctx.moveTo(outline[i][0] * zoomLevel - cropx, outline[i][1] * zoomLevel - cropy);
		ctx.lineTo(outline[i][2] * zoomLevel - cropx, outline[i][3] * zoomLevel - cropy);
		ctx.stroke();
	}

	for (let creature of creatures) {
		ctx.strokeStyle = "#ffffff";

		if (selectedCreature == creature) {
			ctx.strokeStyle = "#ff0000";
		}

		ctx.fillStyle = creature.color;
		ctx.fillCircle(creature.x * zoomLevel - cropx, creature.y * zoomLevel - cropy, creature.size * zoomLevel, true);
		ctx.stroke();
	}

	if (debugMode) {
		ctx.strokeStyle = "#ff0000";
		ctx.lineWidth = 20 * zoomLevel;
		for (let creature of creatures) {
			ctx.beginPath();
			ctx.moveTo(creature.x * zoomLevel - cropx, creature.y * zoomLevel - cropy);
			ctx.lineTo(creature.x * zoomLevel - cropx + Math.cos(creature.rotation) * 200 * zoomLevel, creature.y * zoomLevel - cropy + Math.sin(creature.rotation) * 200 * zoomLevel);
			ctx.stroke();

			ctx.beginPath();
			ctx.moveTo(creature.x * zoomLevel - cropx + Math.cos(creature.rotation) * creature.size * zoomLevel, creature.y * zoomLevel - cropy + Math.sin(creature.rotation) * creature.size * zoomLevel);
			ctx.lineTo(creature.x * zoomLevel - cropx + Math.cos(creature.rotation - Math.PI / 2) * (100 * creature.network.output[0]) * zoomLevel, creature.y * zoomLevel - cropy + Math.sin(creature.rotation - Math.PI / 2) * (100 * creature.network.output[0]) * zoomLevel);
			ctx.stroke();

			ctx.beginPath();
			ctx.moveTo(creature.x * zoomLevel - cropx + Math.cos(creature.rotation) * creature.size * zoomLevel, creature.y * zoomLevel - cropy + Math.sin(creature.rotation) * creature.size * zoomLevel);
			ctx.lineTo(creature.x * zoomLevel - cropx + Math.cos(creature.rotation + Math.PI / 2) * (100 * creature.network.output[1]) * zoomLevel, creature.y * zoomLevel - cropy + Math.sin(creature.rotation + Math.PI / 2) * (100 * creature.network.output[1]) * zoomLevel);
			ctx.stroke();

			for (let eye of creature.eyes) {
				ctx.beginPath();
				ctx.fillRect(creature.x * zoomLevel - cropx + Math.cos(creature.rotation + eye.angle) * eye.distance * zoomLevel - 20 * zoomLevel, creature.y * zoomLevel - cropy + Math.sin(creature.rotation + eye.angle) * eye.distance * zoomLevel - 20 * zoomLevel, 40 * zoomLevel, 40 * zoomLevel);
				ctx.stroke();
			}
		}
	}

	ctz.textAlign = "center";
	ctz.fillStyle = "#222222";
	ctz.font = "48px Calibri";
	ctz.strokeStyle = "hsl(0, 0%, 100%)";
	ctz.lineWidth = 3;

	ctz.strokeText("Year " + year, 1920 / 2, 50);
	ctz.fillText("Year " + year, 1920 / 2, 50);

	ctz.textAlign = "left";
	ctz.strokeText("Population: " + population, 40, 1040);
	ctz.fillText("Population: " + population, 40, 1040);

	ctz.textAlign = "right";
	ctz.strokeText(Math.floor(timescale) + "x", 1880, 1040);
	ctz.fillText(Math.floor(timescale) + "x", 1880, 1040);

	ctz.textAlign = "center";
	if (debugMode) {
		ctz.font = zoomLevel * 128 + "px Calibri";

		let tilex = Math.floor((mouse.current.x + cropx) / tileSize / zoomLevel);
		let tiley = Math.floor((mouse.current.y + cropy) / tileSize / zoomLevel);
		ctz.strokeText(map[tilex][tiley].food.toFixed(1), tilex * tileSize * zoomLevel - cropx + tileSize / 2 * zoomLevel, tiley * tileSize * zoomLevel - cropy + tileSize / 1.5 * zoomLevel);
		ctz.fillText(map[tilex][tiley].food.toFixed(1), tilex * tileSize * zoomLevel - cropx + tileSize / 2 * zoomLevel, tiley * tileSize * zoomLevel - cropy + tileSize / 1.5 * zoomLevel);

		ctx.strokeStyle = "#ffffff";
		ctx.lineWidth = 1;
		ctx.rect(tilex * tileSize * zoomLevel - cropx, tiley * tileSize * zoomLevel - cropy, tileSize * zoomLevel + 2, tileSize * zoomLevel + 2);
		ctx.stroke();
	}

	if (selectedCreature !== null) {
		ctz.fillStyle = "#222222";
		ctz.font = "32px Calibri";
		ctz.strokeStyle = "hsl(0, 0%, 100%)";
		ctz.lineWidth = 3;

		for (let j = 0; j < selectedCreature.network.forget.neurons[0].length; j++) {
			ctz.fillCircle(nnui.xoffset - (nnui.size + 5) * 14, j * (nnui.size * 2 + 5) + nnui.yoffset, nnui.size, nnui.stroke);
		}

		for (let j = 0; j < selectedCreature.network.forget.neurons[selectedCreature.network.forget.neurons.length - 1].length; j++) {
			ctz.fillCircle(nnui.xoffset - (nnui.size + 5) * 10, j * (nnui.size * 2 + nnui.yspacing) + nnui.yoffset, nnui.size, nnui.stroke);
		}

		for (let j = 0; j < selectedCreature.network.decide.neurons[selectedCreature.network.decide.neurons.length - 1].length; j++) {
			ctz.fillCircle(nnui.xoffset - (nnui.size + 5) * 8, j * (nnui.size * 2 + nnui.yspacing) + nnui.yoffset, nnui.size, nnui.stroke);
		}

		for (let j = 0; j < selectedCreature.network.modify.neurons[selectedCreature.network.modify.neurons.length - 1].length; j++) {
			ctz.fillCircle(nnui.xoffset - (nnui.size + 5) * 6, j * (nnui.size * 2 + nnui.yspacing) + nnui.yoffset, nnui.size, nnui.stroke);
		}

		for (let j = 0; j < selectedCreature.network.main.neurons[selectedCreature.network.main.neurons.length - 1].length; j++) {
			ctz.fillCircle(nnui.xoffset - (nnui.size + 5) * 3, j * (nnui.size * 2 + nnui.yspacing) + nnui.yoffset, nnui.size, nnui.stroke);
		}

		for (let i = 0; i < selectedCreature.network.cellState.length; i++) {
			ctz.fillCircle(1920 - 60, i * (nnui.size * 2 + nnui.yspacing) + nnui.yoffset, nnui.size, nnui.stroke);
		}

		ctz.strokeStyle = "#000000";
		ctz.fillStyle = "#ffffff";

		ctz.textAlign = "left";
		ctz.strokeText(selectedCreature.species, 20, 1080 - 20);
		ctz.fillText(selectedCreature.species, 20, 1080 - 20);
		ctz.textAlign = "center";

		ctz.strokeText("Cell State", 1920 - 60, nnui.yoffset + (nnui.size * 2 + nnui.yspacing) * 0 - nnui.size - 12);

		ctz.strokeText("Left", nnui.xoffset - nnui.size * 10, nnui.yoffset + (nnui.size * 2 + nnui.yspacing) * 0 - nnui.size - 12);
		ctz.strokeText("Right", nnui.xoffset - nnui.size * 10, nnui.yoffset + (nnui.size * 2 + nnui.yspacing) * 1 - nnui.size - 12);
		ctz.strokeText("Eat", nnui.xoffset - nnui.size * 10, nnui.yoffset + (nnui.size * 2 + nnui.yspacing) * 2 - nnui.size - 12);
		ctz.strokeText("Attack", nnui.xoffset - nnui.size * 10, nnui.yoffset + (nnui.size * 2 + nnui.yspacing) * 3 - nnui.size - 12);
		ctz.strokeText("Reproduce", nnui.xoffset - nnui.size * 10, nnui.yoffset + (nnui.size * 2 + nnui.yspacing) * 4 - nnui.size - 12);

		for (let i = 0; i < memories; i++) {
			ctz.strokeText("Mem. " + i, nnui.xoffset - nnui.size * 10, nnui.yoffset + (nnui.size * 2 + nnui.yspacing) * (i + 5) - nnui.size - 12);
		}

		ctz.fillText("Cell State", 1920 - 60, nnui.yoffset + (nnui.size * 2 + nnui.yspacing) * 0 - nnui.size - 12);

		ctz.fillText("Left", nnui.xoffset - nnui.size * 10, nnui.yoffset + (nnui.size * 2 + nnui.yspacing) * 0 - nnui.size - 12);
		ctz.fillText("Right", nnui.xoffset - nnui.size * 10, nnui.yoffset + (nnui.size * 2 + nnui.yspacing) * 1 - nnui.size - 12);
		ctz.fillText("Eat", nnui.xoffset - nnui.size * 10, nnui.yoffset + (nnui.size * 2 + nnui.yspacing) * 2 - nnui.size - 12);
		ctz.fillText("Attack", nnui.xoffset - nnui.size * 10, nnui.yoffset + (nnui.size * 2 + nnui.yspacing) * 3 - nnui.size - 12);
		ctz.fillText("Reproduce", nnui.xoffset - nnui.size * 10, nnui.yoffset + (nnui.size * 2 + nnui.yspacing) * 4 - nnui.size - 12);

		for (let i = 0; i < memories; i++) {
			ctz.fillText("Mem. " + i, nnui.xoffset - nnui.size * 10, nnui.yoffset + (nnui.size * 2 + nnui.yspacing) * (i + 5) - nnui.size - 12);
		}

		ctz.font = "bold 21px Calibri";

		for (let j = 0; j < selectedCreature.network.forget.neurons[0].length; j++) {
			ctz.fillText(selectedCreature.network.forget.neurons[0][j].toFixed(1), nnui.xoffset - (nnui.size + 5) * 14, j * (nnui.size * 2 + 5) + nnui.yoffset + 6);
		}

		for (let j = 0; j < selectedCreature.network.forget.neurons[selectedCreature.network.forget.neurons.length - 1].length; j++) {
			ctz.fillText(selectedCreature.network.forget.neurons[selectedCreature.network.forget.neurons.length - 1][j].toFixed(1), nnui.xoffset - (nnui.size + 5) * 10, j * (nnui.size * 2 + nnui.yspacing) + nnui.yoffset + 6);
		}

		for (let j = 0; j < selectedCreature.network.decide.neurons[selectedCreature.network.decide.neurons.length - 1].length; j++) {
			ctz.fillText(selectedCreature.network.decide.neurons[selectedCreature.network.decide.neurons.length - 1][j].toFixed(1), nnui.xoffset - (nnui.size + 5) * 8, j * (nnui.size * 2 + nnui.yspacing) + nnui.yoffset + 6);
		}

		for (let j = 0; j < selectedCreature.network.modify.neurons[selectedCreature.network.modify.neurons.length - 1].length; j++) {
			ctz.fillText(selectedCreature.network.modify.neurons[selectedCreature.network.modify.neurons.length - 1][j].toFixed(1), nnui.xoffset - (nnui.size + 5) * 6, j * (nnui.size * 2 + nnui.yspacing) + nnui.yoffset + 6);
		}

		for (let j = 0; j < selectedCreature.network.main.neurons[selectedCreature.network.main.neurons.length - 1].length; j++) {
			ctz.fillText(selectedCreature.network.main.neurons[selectedCreature.network.main.neurons.length - 1][j].toFixed(1), nnui.xoffset - (nnui.size + 5) * 3, j * (nnui.size * 2 + nnui.yspacing) + nnui.yoffset + 6);
		}

		for (let i = 0; i < selectedCreature.network.cellState.length; i++) {
			ctz.fillText(selectedCreature.network.cellState[i].toFixed(1), 1920 - 60, i * (nnui.size * 2 + nnui.yspacing) + nnui.yoffset + 6);
		}
	}
}