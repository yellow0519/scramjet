export function getOwnPropertyDescriptorHandler(target, prop) {
	const realDescriptor = Reflect.getOwnPropertyDescriptor(target, prop);
	if (!realDescriptor) return realDescriptor;

	if (!realDescriptor.get && !realDescriptor.set) {
		return realDescriptor;
	}

	const wrappedDescriptor: PropertyDescriptor = {
		configurable: realDescriptor.configurable,
		enumerable: realDescriptor.enumerable,
	};

	if (realDescriptor.get) {
		wrappedDescriptor.get = function () {
			return Reflect.get(target, prop, this);
		};
	}

	if (realDescriptor.set) {
		wrappedDescriptor.set = function (value) {
			return Reflect.set(target, prop, value, this);
		};
	}

	return wrappedDescriptor;
}
