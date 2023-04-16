export const getResponse = (code : number , field?: string) => {
    let message,status;
    switch(code){
        case 100:
            message = "Success";
            break;
        case 101:
            message = `${field} already exist`;
            status = "Failed";
            break;
        default :
            message = 'tester'
            break;
        
    }
    return{status : status || 'Passed', message : message} 
}
export const getExistQuery = (field :string, value :string) :string  => {
    return `SELECT data->'${field}' FROM auth_flow WHERE data @> '{"${field}": "${value}"}';`
}
export enum Status{
    PASSED = "Passed",
    FAILED = 'Failed'
}
export enum GST{
    lowGST = 12,
    midGST = 15,
    highGST = 18
}