import express from 'express';
import prisma from './prisma';

const app = express();
app.use(express.json());

// Customers
app.post('/customers', async (req, res) => {
    const { name, email, phoneNumber, address } = req.body;
    const customer = await prisma.customer.create({
        data: { name, email, phoneNumber, address },
    });
    res.json(customer);
});

app.get('/customers/:id', async (req, res) => {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
        where: { id: Number(id) },
    });
    res.json(customer);
});

app.get('/customers/:id/orders', async (req, res) => {
    const { id } = req.params;
    const orders = await prisma.order.findMany({
        where: { customerId: Number(id) },
    });
    res.json(orders);
});

// Restaurants
app.post('/restaurants', async (req, res) => {
    const { name, location } = req.body;
    const restaurant = await prisma.restaurant.create({
        data: { name, location },
    });
    res.json(restaurant);
});

app.get('/restaurants/:id/menu', async (req, res) => {
    const { id } = req.params;
    const menuItems = await prisma.menuItem.findMany({
        where: { restaurantId: Number(id), isAvailable: true },
    });
    res.json(menuItems);
});

// Menu Items
app.post('/restaurants/:id/menu', async (req, res) => {
    const { id } = req.params;
    const { name, price } = req.body;
    const menuItem = await prisma.menuItem.create({
        data: { name, price, restaurantId: Number(id) },
    });
    res.json(menuItem);
});

app.patch('/menu/:id', async (req, res) => {
    const { id } = req.params;
    const { price, isAvailable } = req.body;
    const menuItem = await prisma.menuItem.update({
        where: { id: Number(id) },
        data: { price, isAvailable },
    });
    res.json(menuItem);
});

// Orders
app.post('/orders', async (req, res) => {
    const { customerId, restaurantId, items } = req.body;
    const order = await prisma.order.create({
        data: {
            customerId,
            restaurantId,
            totalPrice: items.reduce((acc, item) => acc + item.price * item.quantity, 0),
            orderItems: {
                create: items.map(item => ({
                    menuItemId: item.menuItemId,
                    quantity: item.quantity,
                })),
            },
        },
    });
    res.json(order);
});

app.get('/orders/:id', async (req, res) => {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
        where: { id: Number(id) },
        include: { orderItems: true },
    });
    res.json(order);
});

app.patch('/orders/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const order = await prisma.order.update({
        where: { id: Number(id) },
        data: { status },
    });
    res.json(order);
});

// Reports & Insights
app.get('/restaurants/:id/revenue', async (req, res) => {
    const { id } = req.params;
    const revenue = await prisma.order.aggregate({
        where: { restaurantId: Number(id) },
        _sum: { totalPrice: true },
    });
    res.json(revenue._sum.totalPrice);
});

app.get('/menu/top-items', async (req, res) => {
    const topItems = await prisma.orderItem.groupBy({
        by: ['menuItemId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 1,
    });
    res.json(topItems);
});

app.get('/customers/top', async (req, res) => {
    const topCustomers = await prisma.order.groupBy({
        by: ['customerId'],
        _count: { _all: true },
        orderBy: { _count: { _all: 'desc' } },
        take: 5,
    });
    res.json(topCustomers);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});