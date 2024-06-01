export class Utils {
  static generateRandomNumber(length) {
    let randomNumber = ""

    for (let i = 0; i < length; i++) {
      const digit = Math.floor(Math.random() * 10).toString()
      randomNumber += digit
    }

    return randomNumber
  }

  static generateEmail() {
    var chars = 'abcdefghijklmnopqrstuvwxyz1234567890';
    var string = '';
    for(var i=0; i<15; i++){
        string += chars[Math.floor(Math.random() * chars.length)];
    }
    return string + '@gmail.com';
  }

  static generateLogin(length) {
    let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    let result = ""
    const charactersLength = characters.length
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }

    return result
  }
}
