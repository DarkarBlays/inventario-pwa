import Product from '../models/product.model.js';

export const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category, sort = '-createdAt' } = req.query;
    const query = { status: 'active' };

    // Búsqueda por texto
    if (search) {
      query.$text = { $search: search };
    }

    // Filtro por categoría
    if (category) {
      query.category = category;
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort(sort)
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit)),
      Product.countDocuments(query)
    ]);

    res.json({
      products,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener productos',
      error: error.message
    });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product || product.status !== 'active') {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener producto',
      error: error.message
    });
  }
};

export const createProduct = async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    
    res.status(201).json({
      message: 'Producto creado exitosamente',
      product
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al crear producto',
      error: error.message
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.json({
      message: 'Producto actualizado exitosamente',
      product
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al actualizar producto',
      error: error.message
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.json({
      message: 'Producto eliminado exitosamente',
      product
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al eliminar producto',
      error: error.message
    });
  }
}; 