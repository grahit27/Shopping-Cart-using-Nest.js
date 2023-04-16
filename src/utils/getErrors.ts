export const getErrors = (code : number , field?: string) => {
    let message:string ,status:string;
    switch(code){
        case 100:
            message = 'Respose not created';
            break;
        case 101:
            message = 'Respose has no Rows';
            break;
        case 102:
            message = `Respose doesnt have ${field}`;
            break;
        default :
            message = 'tester'
            break;
    }
    return{status : status || 'Fail', "message" : message} 
}
