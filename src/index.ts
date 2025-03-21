import { serve } from "@hono/node-server";
import { PrismaClient } from "@prisma/client";
import { Hono } from "hono";

const app = new Hono();

const prisma = new PrismaClient();

// Customers
app.post('/customers', async (c) => {
    const { name, email, phoneNumber, address } = await c.req.json();
    const customer = await prisma.customer.create({
        data: { name, email, phoneNumber, address },
    });
    return c.json(customer);
});

app.get('/customers/:id', async (c) => {
    const { id } = c.req.param();
    const customer = await prisma.customer.findUnique({
        where: { id: Number(id) },
    });
    return c.json(customer);
});

app.get('/customers/:id/orders', async (c) => {
    const { id } = c.req.param();
    const orders = await prisma.order.findMany({
        where: { customerId: Number(id) },
    });
    return c.json(orders);
});

// Restaurants
app.post('/restaurants', async (c) => {
    const { name, location } = await c.req.json();
    const restaurant = await prisma.restaurant.create({
        data: { name, location },
    });
    return c.json(restaurant);
});

app.get('/restaurants/:id/menu', async (c) => {
    const { id } = c.req.param();
    const menuItems = await prisma.menuItem.findMany({
        where: { restaurantId: Number(id), isAvailable: true },
    });
    return c.json(menuItems);
});

// Menu Items
app.post('/restaurants/:id/menu', async (c) => {
    const { id } = c.req.param();
    const { name, price } = await c.req.json();
    const menuItem = await prisma.menuItem.create({
        data: { name, price, restaurantId: Number(id) },
    });
    return c.json(menuItem);
});

app.patch('/menu/:id', async (c) => {
    const { id } = c.req.param();
    const { price, isAvailable } = await c.req.json();
    const menuItem = await prisma.menuItem.update({
        where: { id: Number(id) },
        data: { price, isAvailable },
    });
    return c.json(menuItem);
});

// Orders
app.post('/orders', async (c) => {
    const { customerId, restaurantId, items } = await c.req.json();
    const totalPrice = items.reduce((acc: number, item: { price: number, quantity: number }) => acc + item.price * item.quantity, 0);
    const order = await prisma.order.create({
        data: {
            customerId,
            restaurantId,
            totalPrice,
            orderItems: {
                create: items.map((item: { menuItemId: number, quantity: number }) => ({
                    menuItemId: item.menuItemId,
                    quantity: item.quantity,
                })),
            },
        },
    });
    return c.json(order);
});

app.get('/orders/:id', async (c) => {
    const { id } = c.req.param();
    const order = await prisma.order.findUnique({
        where: { id: Number(id) },
        include: { orderItems: true },
    });
    return c.json(order);
});

app.patch('/orders/:id/status', async (c) => {
    const { id } = c.req.param();
    const { status } = await c.req.json();
    const order = await prisma.order.update({
        where: { id: Number(id) },
        data: { status },
    });
    return c.json(order);
});

// Reports & Insights
app.get('/restaurants/:id/revenue', async (c) => {
    const { id } = c.req.param();
    const revenue = await prisma.order.aggregate({
        where: { restaurantId: Number(id) },
        _sum: { totalPrice: true },
    });
    return c.json(revenue._sum.totalPrice);
});

app.get('/menu/top-items', async (c) => {
    const topItems = await prisma.orderItem.groupBy({
        by: ['menuItemId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 1,
    });
    return c.json(topItems);
});

app.get('/customers/top', async (c) => {
  const topCustomers = await prisma.order.groupBy({
      by: ['customerId'],
      _count: { _all: true },
      orderBy: { _count: { customerId: 'desc' } },
      take: 5,
  });
  return c.json(topCustomers);
});

serve(app);
console.log("Server ON!");