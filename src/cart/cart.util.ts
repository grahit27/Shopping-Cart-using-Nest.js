export const getProductAmount = (price: number, percentGST: number, discount: number, quantity: number, productName: string) => {
    const totalPrice = price * quantity;
    const totalDiscount = (totalPrice * discount) / 100;
    const totalPriceAfterDiscount = totalPrice - totalDiscount;
    const totalGST = (totalPriceAfterDiscount * percentGST) / 100;
    const finalPrice = totalPriceAfterDiscount + totalGST;
    let newData = {
        "productName": productName,
        "quantity": quantity,
        "price": price,
        "percentGST": percentGST,
        "discount": discount,
        "totalPrice": totalPrice,
        "totalPriceAfterDiscount": totalPriceAfterDiscount,
        "totalGST": totalGST,
        "finalPrice": finalPrice,
        "createdAt": new Date(Date.now())
    }
    return newData;
}