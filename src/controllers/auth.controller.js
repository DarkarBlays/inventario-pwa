import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

export const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    // Crear nuevo usuario
    const user = new User({
      email,
      password,
      name
    });

    await user.save();

    // Generar token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al registrar usuario',
      error: error.message
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Verificar si el usuario existe
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Verificar si el usuario está activo
    if (user.status !== 'active') {
      return res.status(401).json({ message: 'Usuario inactivo' });
    }

    // Verificar contraseña
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Generar token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login exitoso',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al iniciar sesión',
      error: error.message
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user.toJSON());
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener perfil',
      error: error.message
    });
  }
}; 