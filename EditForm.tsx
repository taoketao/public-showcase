/*  Morgan is cannibalizing this code to turn into admin-only 
    portal for updating a company's info. 
    
    Currently, it handles String, Boolean, and some Integer company properties.
    See companyProperties list below concerning expanding the feature.

    Admin editing panel usage: Administrators with ...@DOMAIN.com email can see a panel on the upper-left of a company's page. First, the administrator user selects which company property they want to edit. Then, the user can input the new value to change. Simple as that! If the user attempts to give an invalid value, the panel catches and prevents the error. The panel also displays the current value feature. The error and notification systems are implemented.


    */
import { useState } from "react";
import { Select } from "antd";
import { mutate } from "swr";
import { fetcher } from "./util/fetcher";
import { useCompany, useMe } from "./util/hooks";
import { Button, message, Input, Row, Spin } from "antd";

export const EditForm = ({ company: companyToken }) => {
  const { company } = useCompany(companyToken)
  const { me } = useMe();
  const [inputField, setInputField] = useState(""); /* field to update */
  const [inputValueStr, setInputValueStr] = useState(""); /* new value for field */
  const [inputValueBool, setInputValueBool] = useState(false); /* new value for field */
  const [ closeSoonBit, setCloseSoonBit] = useState(Boolean)
  const [ updating, setUpdating ] = useState(false) /* lock */
  const [ updateFrom, setUpdateFrom ] = useState("")
  const [ updateTo, setUpdateTo ] = useState("")
  const [ currentFieldsValue, setCurrentFieldsValue ] = useState("") /* string because it's for vfx only */

  /* list of the company properties that are implemented so far. It's reasonable to 
      export this field and the retrieveProperty function to a data file elsewhere.*/
  const companyProperties = [
    "minSharePrice",
    "maxSharePrice",
    "discountPercent",
    "closingSoon",
    "industry",
  ];

  const prettifyString = (s:String) => { 
    if (s===null)                     {return "<undefined>";}
    s = String(s)
    if (s==="0")                      {return "0"}
    else if (s==="null" )             {return "<undefined>";}
    else if (s==="" || s.length===0)  {return "<empty string>"}
    return s;
  }

  const isIntField = query => ["minSharePrice", "maxSharePrice", "discountPercent"].includes(query) 
  const isValidField = query => companyProperties.includes(query)

  if (me && me.role_id === 1) {
    return (
      <form
        // style={{ padding: "3rem" }}
        onSubmit={async (e) => {          
          if (updating) {
            message.error("Previous update still in progress")
            return null;
          }
          setUpdating(true)

          e.preventDefault();
          if ((inputField !== 'closingSoon') && inputValueStr && inputValueStr.length < 1) {
            message.error(
              `Warning: updating value of field ${inputField} to 'null'. `);
          }

          /* Handle input: internal checks. "if (true)" makes this chunk 
           * collapsable, for code editor collapsing and human readability.*/
          if (true) {
             /* Catch internal errors. 'if true' for collapsability. */
            if (me && me.role_id !== 1) {
              message.error(
                "Internal Error: non-admin has access to admin edit portal"
              );
              setUpdating(false);
              return null;
            }
            if (!me || !me.email) {
              message.error(
                "YInternal Error: you must be logged in. (Internal issue...)"
              );
              setUpdating(false);
              return null;
            }
            if (!isValidField) {
              message.error(
                `Internal Error: invalid field: ${inputField} : (${typeof inputField}`
              );
              setUpdating(false);
              return null;
            }
            if ( inputField === "closingSoon" && typeof inputValueBool !== "boolean" ) {
              message.error(
                "Internal error: closingSoon field has non-boolean corresponding value."
              );
              setUpdating(false);
              return null;
            }
            /* Handle user input */
            if (inputField.length < 1) {
              message.error("Internal error originally {Oops! Please specify a property to update.}");
              setUpdating(false);
              return null;
            }
            if (!companyProperties.includes(inputField)) {
              message.error(
                "Internal Error: Not a valid option to edit. (internal bc button should be hidden until ready)"
              );
              setUpdating(false);
              return null;
            }
          }
          
          /* Handle user input: type and content checks. Currently, checks:
              Strings (industry),   Booleans (closingSoon),   and Integers (...) */
          let _inputValue : any;
          if (inputField === "industry") {
            if (inputValueStr=="") {
              message.info(`Warning: setting field ${inputField} to nothing`)
            }
            _inputValue = inputValueStr
            setInputValueStr("")  
          }
          if (inputField === "closingSoon") {

            if (!closeSoonBit) {
              message.info("Please select an option.")
              setUpdating(false)
              return null;
            }
            if (!closeSoonBit) {
              message.error("Please select a value.")
              setUpdating(false)
              return null;
            }
            _inputValue = inputValueBool
            setInputValueBool(null)
            setCloseSoonBit(false)
          }
          if (isIntField(inputField)) {
            let inpVal = inputValueStr
            let intValueToSet;
            if (inputValueStr==="null" || inputValueStr=="") {
              message.warn( "No value provided. Not changing. ")
              setUpdating(false);
              return null;
            }
            const parsedInt:number = parseInt(inpVal)
            const isInvalidInt = isNaN(parseInt(inpVal)) || (inpVal!=parseInt(inpVal).toString() )
            if (isInvalidInt) {
              message.error( `Error: Not a valid integer value: ${inpVal}`)
              setUpdating(false);
              return null;
            }
            intValueToSet = parseInt(inpVal) 
            // message.error(`DEV careful that intValueToSet is valid: ${intValueToSet}`)
            if (inputField === 'minSharePrice'){
              if (intValueToSet > company.maxSharePrice) {

                message.error(`Error: new minimum shared price ${intValueToSet}`+
                ` is greater than current maximum shared price`+
                `. No changes made.`)
                setUpdating(false);
                return null;
              }
              if (intValueToSet < 0) { message.info("Notice: setting share price to negative value.")}

            }
            if (inputField === 'maxSharePrice') {
              if (intValueToSet < company.minSharePrice) {
                message.error(`Error: new maximum shared price ${intValueToSet}`+
                ` is less than current minimum shared price ${company.minSharePrice}`+
                `. No changes made.`)
                setUpdating(false);
                return null;              
              }
              if (intValueToSet < 0) { message.info("Notice: setting share price to negative value.")}
            } 
            if (inputField === 'discountPercent'){
              if (intValueToSet < 0 || intValueToSet > 100) {
                message.error(`Error: new discount percent ${intValueToSet}`+
                ` is not between 0% and 100%.`)
                setUpdating(false);
                return null;                
              }            
            }
            _inputValue = intValueToSet
            setInputValueStr("")
          }

          setUpdateFrom(currentFieldsValue);
          setUpdateTo(_inputValue);
          message.warn(`Updating property ${inputField} from ${currentFieldsValue} to ${_inputValue}...`, 4);

          const editResponse = await fetcher("/api/company/edit", {
            id: company.id,
            whichField: inputField,
            newValue: _inputValue,
          });
          await mutate("pages/api/company"+companyToken)

          if (!editResponse.success) {
            message.warn("Fail. Error: "+editResponse.error)
            // assert currentFieldsValue is unchanged.
            setUpdating(false);
            return null
          } else {
            message.success("Success.")
          }
          setCurrentFieldsValue(_inputValue);
          setUpdating(false);
          return null;
        }}
      >

        <h3>Admin Edit Panel</h3>
        {/* which-properties selector dropdown: */}
         <Row>Property to edit:</Row>
        <Select
          showSearch
          filterOption={(input, option) =>
            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
          }
          style={{ width: "100%" }}
          onChange={(chosenField: string) => {
            setInputField(chosenField); 
            setInputValueStr(""); 
            setCurrentFieldsValue(company[chosenField]);
            setCloseSoonBit(false); 
          }}
          onSelect={(chosenField:string)=>{
            setCurrentFieldsValue(company[chosenField])
          } }      
        >
          {company &&
            companyProperties.map((c) => <Option value={c}>{c}</Option>)}
        </Select>
        { isValidField(inputField) && !updating ?<Row> Current value:&nbsp;&nbsp;{prettifyString(currentFieldsValue)}{updating?"...":""}</Row> : null}
        { isValidField(inputField) &&  updating ?<Row> Updating from {prettifyString(updateFrom)} to {prettifyString(updateTo)} ...</Row> : null} 
        {/* forms for the user to input what new value to assign to the selected property: */}
        { isValidField(inputField) && inputField!=="closingSoon" ? <Row>Enter new value: </Row> : null }
        { isValidField(inputField) && inputField==="closingSoon" ? <Row>Select new value: </Row> : null }
        <Row>  { isValidField(inputField) && inputField==="closingSoon" ? (
            <Select
              style={{ width: "100%" }} 
              defaultValue={null}
              defaultActiveFirstOption={false}
              onChange={(value: bool) => {
                setInputValueBool(value);  
              }}
              onClick={() => {setCloseSoonBit(true)}}
            >
              <Option value={true}>true</Option>
              <Option value={false}>false</Option>
            </Select>
          ) : null}
          
          { isValidField(inputField) && inputField!=="closingSoon" ? ( 
            <Input
              value={inputValueStr}
              onChange={(e ) => {
                setInputValueStr(e.target.value); 
              }}
              onPressEnter={(e) => setInputValueStr(e.target.value)}
            />
            ) : null}
        </Row>  
        { isValidField(inputField) && !updating ?<Row> <Button htmlType="submit">Create</Button></Row> : null}
        { isValidField(inputField) &&  updating ?<Spin />: null} 

      </form>
    );
  }
  return null;
};
