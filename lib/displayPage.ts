


// Complement the **page state** as `State Pattern`.
// Complement the **display methods** as `Strategy Pattern`.


class DisplayPage{
    private state: SinglePageState | HorizontalPageState | DoublePageState | ScrollPageState; // state pattern

    constructor(){
        this.state = new SinglePageState();
    }

    public changeState(newState: SinglePageState | HorizontalPageState | DoublePageState | ScrollPageState){
        this.state = newState;
    }

    // ---------------------------------
    // Display Page Methods
    // ---------------------------------
    public show(){
    }

    public prevPage(){
    }
    public nextPage(){
    }
}


// ---------------------------------
// Page State Classes
// ---------------------------------
interface PageState{

}

class SinglePageState implements PageState{
    // private strategy: DisplayImageStrategy | DisplayEpubStrategy | DisplayPdfStrategy; // strategy pattern

}

class HorizontalPageState implements PageState{
}
class DoublePageState implements PageState{
}
class ScrollPageState implements PageState{
}

// ---------------------------------
// Display Methods Classes
// ---------------------------------
interface DisplayStrategy{
    
}

class DisplayImageStrategy implements DisplayStrategy{
}
class DisplayEpubStrategy implements DisplayStrategy{
}
class DisplayPdfStrategy implements DisplayStrategy{
}